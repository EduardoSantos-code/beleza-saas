import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ClubSubscriptionStatus } from "@prisma/client";

function getAsaasExternalReference(body: any): string | null {
  return (
    body.payment?.externalReference ||
    body.subscription?.externalReference ||
    body.externalReference ||
    null
  );
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getMonthsForBillingCycle(cycle: string): number {
  switch (cycle) {
    case "MONTHLY": return 1;
    case "QUARTERLY": return 3;
    case "SEMIANNUAL": return 6;
    case "YEARLY": return 12;
    default: return 1;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "asaas-webhook",
    message: "Webhook Asaas ativo. Use POST para enviar eventos."
  });
}

export async function POST(req: Request) {
  try {
    const asaasToken = req.headers.get("asaas-access-token");

    if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;
    const externalReference = getAsaasExternalReference(body);

    // Lógica para Clube de Assinaturas
    if (externalReference?.startsWith("club_subscription:")) {
      const clubSubscriptionId = externalReference.replace("club_subscription:", "");
      console.log("[ASAAS_WEBHOOK] Evento recebido:", event);
      console.log("[ASAAS_CLUB_WEBHOOK] Processando assinatura:", clubSubscriptionId);
      const clubSub = await prisma.clubSubscription.findUnique({
        where: { id: clubSubscriptionId },
        include: { plan: true },
      });

      if (!clubSub) {
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        const months = getMonthsForBillingCycle(clubSub.plan.billingCycle);
        await prisma.clubSubscription.update({
          where: { id: clubSubscriptionId },
          data: {
            status: "ACTIVE" as ClubSubscriptionStatus,
            currentPeriodStart: new Date(),
            currentPeriodEnd: addMonths(new Date(), months),
            providerPaymentId: payment?.id,
            providerSubscriptionId: payment?.subscription || clubSub.providerSubscriptionId,
          },
        });
      } else if (event === "PAYMENT_OVERDUE") {
        await prisma.clubSubscription.update({
          where: { id: clubSubscriptionId },
          data: { status: "OVERDUE" as ClubSubscriptionStatus },
        });
      } else if (["PAYMENT_DELETED", "PAYMENT_REFUNDED", "SUBSCRIPTION_DELETED"].includes(event)) {
        await prisma.clubSubscription.update({
          where: { id: clubSubscriptionId },
          data: { status: "CANCELED" as ClubSubscriptionStatus, canceledAt: new Date() },
        });
      }
      return NextResponse.json({ ok: true, type: "club_subscription" }, { status: 200 });
    }

    console.log(`[ASAAS WEBHOOK] Evento recebido: ${event}`);

    // O Asaas envia o ID do cliente ou da assinatura no objeto payment
    const asaasCustomerId = payment.customer;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        // 🚀 PAGAMENTO APROVADO: Ativa o plano do barbeiro
        await prisma.tenant.update({
          where: { asaasCustomerId: asaasCustomerId },
          data: { 
            planStatus: "ACTIVE",
          },
        });
        console.log(`✅ Tenant ${asaasCustomerId} ativado!`);
        break;

      case "PAYMENT_OVERDUE":
        // ⚠️ ATRASADO: Marca como inadimplente (você decide se bloqueia agora ou depois)
        await prisma.tenant.update({
          where: { asaasCustomerId: asaasCustomerId },
          data: { planStatus: "OVERDUE" },
        });
        break;

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
      case "SUBSCRIPTION_DELETED":
        // ❌ CANCELADO: Remove o acesso
        await prisma.tenant.update({
          where: { asaasCustomerId: asaasCustomerId },
          data: { planStatus: "EXPIRED" },
        });
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Erro no processamento do Webhook:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}