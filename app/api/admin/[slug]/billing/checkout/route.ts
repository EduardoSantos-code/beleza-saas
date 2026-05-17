// app/api/admin/[slug]/billing/checkout/route.ts
import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

const ASAAS_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";
const ASAAS_KEY = process.env.ASAAS_API_KEY;

function getAsaasErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const obj = data as Record<string, unknown>;
  const errors = Array.isArray(obj.errors) ? obj.errors : [];

  const firstError =
    errors.length > 0 &&
    typeof errors[0] === "object" &&
    errors[0] !== null
      ? (errors[0] as Record<string, unknown>)
      : null;

  const description =
    typeof firstError?.description === "string"
      ? firstError.description.trim()
      : "";

  const message =
    typeof obj.message === "string" ? obj.message.trim() : "";

  return description || message || fallback;
}

function hasAsaasErrors(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.errors) && obj.errors.length > 0;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.log(
      `[CHECKOUT] Iniciando checkout para ${slug}. URL do Asaas: ${ASAAS_URL}`
    );

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!ASAAS_KEY) {
      return NextResponse.json(
        { error: "ASAAS_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      include: {
        memberships: {
          include: { user: true },
          where: { role: "OWNER" },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }

    if (!tenant.cpfCnpj) {
      return NextResponse.json(
        { error: "CPF/CNPJ é obrigatório para o checkout" },
        { status: 400 }
      );
    }

    const owner = tenant.memberships[0]?.user;
    let asaasCustomerId = tenant.asaasCustomerId;

    const headers = {
      "Content-Type": "application/json",
      access_token: ASAAS_KEY,
    };

    // 1. CRIAR OU ATUALIZAR CLIENTE NO ASAAS
    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: tenant.name,
          email: owner?.email || "dudu.santos2097@gmail.com",
          cpfCnpj: tenant.cpfCnpj,
          externalReference: tenant.id,
        }),
      });

      const customerData = await customerRes.json();

      if (!customerRes.ok || hasAsaasErrors(customerData)) {
        console.error("[ASAAS_CUSTOMER_ERROR]", customerData);
        throw new Error(
          getAsaasErrorMessage(customerData, "Erro ao criar cliente no Asaas.")
        );
      }

      if (!customerData?.id || typeof customerData.id !== "string") {
        console.error("[ASAAS_CUSTOMER_INVALID_RESPONSE]", customerData);
        throw new Error("Resposta inválida ao criar cliente no Asaas.");
      }

      asaasCustomerId = customerData.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { asaasCustomerId },
      });
    } else {
      const updateCustomerRes = await fetch(
        `${ASAAS_URL}/customers/${asaasCustomerId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            cpfCnpj: tenant.cpfCnpj,
          }),
        }
      );

      const updateCustomerData = await updateCustomerRes.json();

      if (!updateCustomerRes.ok || hasAsaasErrors(updateCustomerData)) {
        console.error("[ASAAS_CUSTOMER_UPDATE_ERROR]", updateCustomerData);
        throw new Error(
          getAsaasErrorMessage(
            updateCustomerData,
            "Erro ao atualizar cliente no Asaas."
          )
        );
      }
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
          value: 39.0,
          nextDueDate: today,
          cycle: "MONTHLY",
          description: "Assinatura Trato Pro",
        }),
      });

      const subData = await subRes.json();

      if (!subRes.ok || hasAsaasErrors(subData)) {
        console.error("[ASAAS_SUBSCRIPTION_ERROR]", subData);
        throw new Error(
          getAsaasErrorMessage(subData, "Erro ao criar assinatura no Asaas.")
        );
      }

      if (!subData?.id || typeof subData.id !== "string") {
        console.error("[ASAAS_SUBSCRIPTION_INVALID_RESPONSE]", subData);
        throw new Error("Resposta inválida ao criar assinatura no Asaas.");
      }

      asaasSubscriptionId = subData.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { asaasSubscriptionId },
      });
    }

    // 3. BUSCAR LINK DE PAGAMENTO
    const paymentsRes = await fetch(
      `${ASAAS_URL}/payments?subscription=${asaasSubscriptionId}`,
      {
        method: "GET",
        headers,
      }
    );

    const paymentsData = await paymentsRes.json();

    if (!paymentsRes.ok || hasAsaasErrors(paymentsData)) {
      console.error("[ASAAS_PAYMENTS_ERROR]", paymentsData);
      throw new Error(
        getAsaasErrorMessage(
          paymentsData,
          "Erro ao buscar faturas da assinatura no Asaas."
        )
      );
    }

    const paymentsList = Array.isArray(paymentsData?.data)
      ? paymentsData.data
      : [];

    const currentPayment =
      paymentsList.length > 0 &&
      typeof paymentsList[0] === "object" &&
      paymentsList[0] !== null
        ? (paymentsList[0] as Record<string, unknown>)
        : null;

    const invoiceUrl =
      currentPayment && typeof currentPayment.invoiceUrl === "string"
        ? currentPayment.invoiceUrl
        : null;

    if (!currentPayment || !invoiceUrl) {
      console.error("[ASAAS_PAYMENT_NOT_FOUND]", paymentsData);
      throw new Error("Não foi possível localizar a fatura.");
    }

    return NextResponse.json({
      ok: true,
      url: invoiceUrl,
    });
  } catch (error: unknown) {
    console.error("Erro no Checkout Asaas:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao gerar cobrança",
      },
      { status: 500 }
    );
  }
}
