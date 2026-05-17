import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "asaas-webhook",
    scope: "tenant-saas",
    message: "Webhook Asaas do SaaS ativo. Use POST para enviar eventos.",
  });
}

export async function POST(req: Request) {
  try {
    const asaasToken = req.headers.get("asaas-access-token");

    if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment, subscription } = body;

    console.log(`[ASAAS WEBHOOK] Evento recebido: ${event}`);

    const asaasCustomerId = payment?.customer || subscription?.customer;

    if (!asaasCustomerId) {
      return NextResponse.json(
        { error: "customer não enviado pelo Asaas" },
        { status: 400 }
      );
    }

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        await prisma.tenant.update({
          where: { asaasCustomerId },
          data: {
            planStatus: "ACTIVE",
            subscriptionStatus: "ACTIVE",
          },
        });
        console.log(`✅ Tenant ${asaasCustomerId} ativado!`);
        break;

      case "PAYMENT_OVERDUE":
        await prisma.tenant.update({
          where: { asaasCustomerId },
          data: {
            planStatus: "OVERDUE",
            subscriptionStatus: "PAST_DUE",
          },
        });
        console.log(`⚠️ Tenant ${asaasCustomerId} em atraso!`);
        break;

      case "PAYMENT_DELETED":
      case "SUBSCRIPTION_DELETED":
        await prisma.tenant.update({
          where: { asaasCustomerId },
          data: {
            planStatus: "EXPIRED",
            subscriptionStatus: "CANCELED",
          },
        });
        console.log(`❌ Tenant ${asaasCustomerId} cancelado!`);
        break;

      default:
        console.log(`[ASAAS WEBHOOK] Evento ignorado: ${event}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Erro no processamento do Webhook:", error?.message || error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
