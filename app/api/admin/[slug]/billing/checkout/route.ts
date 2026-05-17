// app/api/admin/[slug]/billing/checkout/route.ts
import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

const ASAAS_URL = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3";
const ASAAS_KEY = process.env.ASAAS_API_KEY;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 💡 LOG DE VERIFICAÇÃO (Adicione esta linha aqui)
    console.log(`[CHECKOUT] Iniciando checkout para ${slug}. URL do Asaas: ${ASAAS_URL}`);

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!ASAAS_KEY) return NextResponse.json({ error: "ASAAS_API_KEY não configurada" }, { status: 500 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      include: {
        memberships: { include: { user: true }, where: { role: "OWNER" }, take: 1 },
      },
    });

    if (!tenant) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

    if (!tenant.cpfCnpj) {
      return NextResponse.json({ error: "CPF/CNPJ é obrigatório para o checkout" }, { status: 400 });
    }

    const owner = tenant.memberships[0]?.user;
    let asaasCustomerId = tenant.asaasCustomerId;
    
    const headers = {
      "Content-Type": "application/json",
      "access_token": ASAAS_KEY,
    };

    // 1. CRIAR OU ATUALIZAR CLIENTE NO ASAAS
    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: tenant.name,
          email: owner?.email || "dudu.santos2097@gmail.com",
          cpfCnpj: tenant.cpfCnpj, // Enviando o CPF na criação
          externalReference: tenant.id,
        }),
      });

      const customerData = await customerRes.json();
      if (customerData.errors) throw new Error(customerData.errors[0].description);
      asaasCustomerId = customerData.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { asaasCustomerId },
      });
    } else {
      // 💡 GARANTIA: Se já tem ID, vamos atualizar o CPF só por segurança
      await fetch(`${ASAAS_URL}/customers/${asaasCustomerId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ cpfCnpj: tenant.cpfCnpj }),
      });
    }

    // 2. CRIAR ASSINATURA
    let asaasSubscriptionId = tenant.asaasSubscriptionId;

    if (!asaasSubscriptionId) {
      const today = new Date().toISOString().split("T")[0];

      const subRes = await fetch(`${ASAAS_URL}/subscriptions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "UNDEFINED",
          value: 39.00,
          nextDueDate: today,
          cycle: "MONTHLY",
          description: "Assinatura Trato Pro",
        }),
      });

      const subData = await subRes.json();
      
      // O erro estava acontecendo aqui porque o cliente lá no Asaas estava sem CPF
      if (subData.errors) {
        console.error("ERRO DO ASAAS NA ASSINATURA:", subData.errors);
        throw new Error(subData.errors[0].description);
      }

      asaasSubscriptionId = subData.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { asaasSubscriptionId },
      });
    }

    // 3. BUSCAR LINK DE PAGAMENTO
    const paymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${asaasSubscriptionId}`, {
      method: "GET",
      headers,
    });
    
    const paymentsData = await paymentsRes.json();
    const currentPayment = paymentsData.data[0];

    if (!currentPayment) throw new Error("Não foi possível localizar a fatura.");

    return NextResponse.json({
      ok: true,
      url: currentPayment.invoiceUrl, 
    });

  } catch (error: any) {
    console.error("Erro no Checkout Asaas:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao gerar cobrança" },
      { status: 500 }
    );
  }
}