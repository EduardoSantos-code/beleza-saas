import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { decryptSecret } from "@/lib/crypto";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  listAsaasSubscriptionPayments,
  ClubAsaasEnvironment,
} from "@/lib/asaas-club";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; subscriptionId: string }> }
) {
  try {
    const { slug, subscriptionId } = await params;
    const body = await request.json();
    const { cpfCnpj } = body;

    // 1. Validar cpfCnpj
    const cleanCpfCnpj = (cpfCnpj || "").replace(/\D/g, "");
    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
      return NextResponse.json(
        { error: "Informe um CPF ou CNPJ válido." },
        { status: 400 }
      );
    }

    // 2. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        clubEnabled: true,
        clubPaymentProvider: true,
        clubAsaasApiKeyEnc: true,
        clubAsaasEnvironment: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
    }

    // 3. Validar configurações do clube
    if (
      !tenant.clubEnabled ||
      tenant.clubPaymentProvider !== "ASAAS" ||
      !tenant.clubAsaasApiKeyEnc
    ) {
      return NextResponse.json(
        { error: "Pagamento do clube ainda não configurado pela barbearia." },
        { status: 400 }
      );
    }

    // 4. Validar cookie de sessão do cliente
    const cookieStore = await cookies();
    const token = cookieStore.get("club_client_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Sessão expirada ou inválida." }, { status: 401 });
    }

    const secret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    if (process.env.NODE_ENV === "production" && secret === "dev-only-client-session-secret") {
      return NextResponse.json({ error: "Erro interno de configuração." }, { status: 500 });
    }

    const encodedSecret = new TextEncoder().encode(secret);
    let payload;
    try {
      const verified = await jwtVerify(token, encodedSecret);
      payload = verified.payload as {
        tenantId: string;
        slug: string;
        phoneE164: string;
        purpose: string;
      };
    } catch {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const phoneRegex = /^\+55\d{11}$/;
    if (
      payload.tenantId !== tenant.id ||
      payload.slug !== tenant.slug ||
      payload.purpose !== "CLUB_SUBSCRIBE" ||
      !phoneRegex.test(payload.phoneE164)
    ) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    // 5. Buscar ClubSubscription
    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 });
    }

    // 6. Validar status e cliente
    if (subscription.client.phoneE164 !== payload.phoneE164) {
      return NextResponse.json({ error: "Cliente não corresponde à sessão." }, { status: 401 });
    }

    if (subscription.status === "ACTIVE") {
      return NextResponse.json({
        ok: true,
        message: "Assinatura já está ativa.",
        subscriptionId: subscription.id,
      });
    }

    if (subscription.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta assinatura não pode ser processada." },
        { status: 400 }
      );
    }

    // 7. Se já tiver checkoutUrl, retornar
    if (subscription.providerCheckoutUrl) {
      return NextResponse.json({
        ok: true,
        checkoutUrl: subscription.providerCheckoutUrl,
        subscriptionId: subscription.id,
        alreadyCreated: true,
      });
    }

    // 8. Descriptografar chave
    const apiKey = decryptSecret(tenant.clubAsaasApiKeyEnc);
    const environment = tenant.clubAsaasEnvironment as ClubAsaasEnvironment;

    // 9. Criar customer no Asaas
    const asaasCustomer = await createAsaasCustomer({
      apiKey,
      environment,
      name: subscription.client.name,
      cpfCnpj: cleanCpfCnpj,
      phoneE164: subscription.client.phoneE164,
      externalReference: `club_client:${tenant.id}:${subscription.clientId}`,
    });

    // 10. Criar assinatura no Asaas
    const asaasSubscription = await createAsaasSubscription({
      apiKey,
      environment,
      customerId: asaasCustomer.id,
      valueInCents: subscription.plan.priceInCents,
      cycle: subscription.plan.billingCycle as any,
      description: `Clube ${subscription.plan.name} - ${tenant.name}`,
      externalReference: `club_subscription:${subscription.id}`,
    });

    // 11. Buscar cobranças
    const payments = await listAsaasSubscriptionPayments({
      apiKey,
      environment,
      subscriptionId: asaasSubscription.id,
    });

    // 12. Pegar a primeira cobrança
    const firstPayment = payments.data?.[0];
    if (!firstPayment) {
      throw new Error("Nenhuma cobrança gerada para a assinatura.");
    }

    // 13. Definir checkoutUrl
    const checkoutUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Assinatura criada, mas não foi possível localizar o link de pagamento." },
        { status: 500 }
      );
    }

    // 14. Atualizar ClubSubscription
    await prisma.clubSubscription.update({
      where: { id: subscription.id },
      data: {
        providerCustomerId: asaasCustomer.id,
        providerSubscriptionId: asaasSubscription.id,
        providerPaymentId: firstPayment.id,
        providerCheckoutUrl: checkoutUrl,
        provider: "ASAAS",
      },
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      subscriptionId: subscription.id,
      providerSubscriptionId: asaasSubscription.id,
    });
  } catch (error) {
    console.error("[CLUB_CHECKOUT_ERROR]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erro ao processar checkout." }, { status: 500 });
  }
}