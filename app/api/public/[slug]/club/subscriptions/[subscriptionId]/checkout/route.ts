import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getClubBillingProviderFromTenant } from "@/lib/club-billing";

type RouteParams = {
  slug: string;
  subscriptionId: string;
};

type CheckoutBody = {
  cpfCnpj?: unknown;
};

type ClubClientSessionPayload = JWTPayload & {
  tenantId?: string;
  slug?: string;
  phoneE164?: string;
  purpose?: string;
};

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function buildPortalReturnUrl(request: Request, slug: string): string {
  const requestUrl = new URL(request.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    requestUrl.origin;

  return `${baseUrl}/s/${slug}/clube/minha-assinatura`;
}

function buildNotificationUrl(
  request: Request,
  provider: "ASAAS" | "MERCADO_PAGO"
): string {
  const requestUrl = new URL(request.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    requestUrl.origin;

  if (provider === "ASAAS") {
    return `${baseUrl}/api/webhooks/asaas/club`;
  }

  return `${baseUrl}/api/webhooks/mercadopago`;
}

function getSessionSecret(): string {
  return (
    process.env.CLIENT_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-client-session-secret"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { slug, subscriptionId } = await params;
    const body = (await request.json()) as CheckoutBody;

    const cleanCpfCnpj = onlyDigits(nonEmptyString(body.cpfCnpj) || "");
    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
      return NextResponse.json(
        { error: "Informe um CPF ou CNPJ válido." },
        { status: 400 }
      );
    }

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
        clubMercadoPagoAccessTokenEnc: true,
        clubMercadoPagoPublicKey: true,
        clubMercadoPagoEnvironment: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Barbearia não encontrada." },
        { status: 404 }
      );
    }

    if (!tenant.clubEnabled) {
      return NextResponse.json(
        { error: "Clube indisponível." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("club_client_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Sessão expirada ou inválida." },
        { status: 401 }
      );
    }

    const sessionSecret = getSessionSecret();

    if (
      process.env.NODE_ENV === "production" &&
      sessionSecret === "dev-only-client-session-secret"
    ) {
      return NextResponse.json(
        { error: "Erro interno de configuração." },
        { status: 500 }
      );
    }

    let payload: ClubClientSessionPayload;

    try {
      const verified = await jwtVerify(
        token,
        new TextEncoder().encode(sessionSecret)
      );
      payload = verified.payload as ClubClientSessionPayload;
    } catch {
      return NextResponse.json(
        { error: "Sessão inválida." },
        { status: 401 }
      );
    }

    const phoneRegex = /^\+55\d{11}$/;

    if (
      payload.tenantId !== tenant.id ||
      payload.slug !== tenant.slug ||
      payload.purpose !== "CLUB_SUBSCRIBE" ||
      !payload.phoneE164 ||
      !phoneRegex.test(payload.phoneE164)
    ) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: "Assinatura não encontrada." },
        { status: 404 }
      );
    }

    if (subscription.client.phoneE164 !== payload.phoneE164) {
      return NextResponse.json(
        { error: "Cliente não corresponde à sessão." },
        { status: 401 }
      );
    }

    if (subscription.status === "ACTIVE") {
      return NextResponse.json({
        ok: true,
        message: "Assinatura já está ativa.",
        subscriptionId: subscription.id,
        provider: subscription.provider,
      });
    }

    if (subscription.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta assinatura não pode ser processada." },
        { status: 400 }
      );
    }

    if (subscription.providerCheckoutUrl) {
      return NextResponse.json({
        ok: true,
        checkoutUrl: subscription.providerCheckoutUrl,
        subscriptionId: subscription.id,
        provider: subscription.provider,
        alreadyCreated: true,
      });
    }

    let providerSetup:
      | ReturnType<typeof getClubBillingProviderFromTenant>
      | undefined;

    try {
      providerSetup = getClubBillingProviderFromTenant(
        {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          clubPaymentProvider: subscription.provider,
          clubAsaasEnvironment: tenant.clubAsaasEnvironment,
          clubMercadoPagoEnvironment: tenant.clubMercadoPagoEnvironment,
        },
        {
          asaasApiKey: tenant.clubAsaasApiKeyEnc
            ? decryptSecret(tenant.clubAsaasApiKeyEnc)
            : null,
          mercadoPagoAccessToken: tenant.clubMercadoPagoAccessTokenEnc
            ? decryptSecret(tenant.clubMercadoPagoAccessTokenEnc)
            : null,
          mercadoPagoPublicKey: tenant.clubMercadoPagoPublicKey,
        }
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Pagamento do clube não configurado corretamente.",
        },
        { status: 400 }
      );
    }

    if (
      subscription.providerSubscriptionId &&
      !subscription.providerCheckoutUrl &&
      providerSetup.provider === subscription.provider
    ) {
      return NextResponse.json(
        {
          error:
            "Esta assinatura já foi iniciada no gateway, mas o link de pagamento não está disponível. Verifique o estado no painel administrativo.",
        },
        { status: 409 }
      );
    }

    const externalReference =
      subscription.providerReference || `clubsub:${tenant.id}:${subscription.id}`;

    const providerResult = await providerSetup.adapter.createSubscription({
      providerConfig: providerSetup.config,
      planId: subscription.plan.id,
      planName: subscription.plan.name,
      priceInCents: subscription.plan.priceInCents,
      billingCycle: subscription.plan.billingCycle,
      customer: {
        clientId: subscription.client.id,
        name: subscription.client.name,
        phoneE164: subscription.client.phoneE164,
        email: subscription.client.email,
        cpfCnpj: cleanCpfCnpj,
      },
      externalReference,
      returnUrl: buildPortalReturnUrl(request, slug),
      notificationUrl: buildNotificationUrl(request, providerSetup.provider),
      description: `Clube ${subscription.plan.name} - ${tenant.name}`,
    });

    const updatedSubscription = await prisma.clubSubscription.update({
      where: { id: subscription.id },
      data: {
        provider: providerResult.provider,
        providerCustomerId: providerResult.providerCustomerId ?? null,
        providerSubscriptionId: providerResult.providerSubscriptionId ?? null,
        providerPaymentId: providerResult.providerPaymentId ?? null,
        providerCheckoutUrl: providerResult.providerCheckoutUrl ?? null,
        providerStatusRaw: providerResult.providerStatusRaw ?? null,
        providerReference:
          providerResult.providerReference ?? externalReference,
        lastProviderSyncAt: new Date(),
      },
      select: {
        id: true,
        provider: true,
        providerSubscriptionId: true,
        providerPaymentId: true,
        providerCheckoutUrl: true,
      },
    });

    if (!updatedSubscription.providerCheckoutUrl) {
      return NextResponse.json(
        {
          error:
            "Assinatura criada, mas não foi possível localizar o link de pagamento.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl: updatedSubscription.providerCheckoutUrl,
      subscriptionId: updatedSubscription.id,
      provider: updatedSubscription.provider,
      providerSubscriptionId: updatedSubscription.providerSubscriptionId,
      providerPaymentId: updatedSubscription.providerPaymentId,
    });
  } catch (error) {
    console.error(
      "[CLUB_CHECKOUT_ERROR]",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "Erro ao processar checkout." },
      { status: 500 }
    );
  }
}
