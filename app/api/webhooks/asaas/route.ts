import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const asaasToken = req.headers.get("asaas-access-token");

    // Verifique se o token que chegou é o mesmo que você definiu no painel
    if (asaasToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { event, payment } = body;

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
            // Opcional: Se quiser dar mais 30 dias de trial a partir de agora
            // trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
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
      case "SUBSCRIPTION_DELETED":
        // ❌ CANCELADO: Remove o acesso
        await prisma.tenant.update({
          where: { asaasCustomerId: asaasCustomerId },
          data: { planStatus: "EXPIRED" },
        });
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Erro no processamento do Webhook:", error.message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}