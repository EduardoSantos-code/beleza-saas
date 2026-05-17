import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getClubBillingProviderFromTenant } from "@/lib/club-billing";

type SubscribeBody = {
  name?: unknown;
  email?: unknown;
  planId?: unknown;
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

function normalizeEmail(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  return raw.toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildPortalReturnUrl(request: Request, slug: string): string {
  const requestUrl = new URL(request.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    requestUrl.origin;

  return `${baseUrl}/s/${slug}/clube`;
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as SubscribeBody;

    const name = nonEmptyString(body.name);
    const email = normalizeEmail(body.email);
    const planId = nonEmptyString(body.planId);

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Nome inválido (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "E-mail inválido." },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: "Plano é obrigatório." },
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
        { error: "Tenant não encontrado." },
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
    const sessionToken = cookieStore.get("club_client_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Valide seu WhatsApp para continuar." },
        { status: 401 }
      );
    }

    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    if (
      process.env.NODE_ENV === "production" &&
      sessionSecret === "dev-only-client-session-secret"
    ) {
      console.error("Missing CLIENT_SESSION_SECRET in production");
      return NextResponse.json(
        { error: "Erro interno no servidor." },
        { status: 500 }
      );
    }

    let payload: ClubClientSessionPayload;

    try {
      const verified = await jwtVerify(
        sessionToken,
        new TextEncoder().encode(sessionSecret)
      );
      payload = verified.payload as ClubClientSessionPayload;
    } catch {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada." },
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
        { error: "Sessão inválida." },
        { status: 401 }
      );
    }

    const plan = await prisma.clubPlan.findFirst({
      where: {
        id: planId,
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        priceInCents: true,
        billingCycle: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plano indisponível." },
        { status: 404 }
      );
    }

    const client = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: tenant.id,
          phoneE164: payload.phoneE164,
        },
      },
      create: {
        tenantId: tenant.id,
        phoneE164: payload.phoneE164,
        name,
        email,
      },
      update: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        phoneE164: true,
        email: true,
      },
    });

    const existingActiveSubscription = await prisma.clubSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        planId: plan.id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        status: true,
        provider: true,
        providerCheckoutUrl: true,
        providerSubscriptionId: true,
        providerReference: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingActiveSubscription) {
      return NextResponse.json({
        ok: true,
        subscription: {
          id: existingActiveSubscription.id,
          status: existingActiveSubscription.status,
          provider: existingActiveSubscription.provider,
          planId: existingActiveSubscription.plan.id,
          planName: existingActiveSubscription.plan.name,
          checkoutUrl: existingActiveSubscription.providerCheckoutUrl,
        },
        nextStep: "SUBSCRIPTION_ACTIVE",
      });
    }

    const pendingSubscription = await prisma.clubSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        planId: plan.id,
        status: "PENDING",
      },
      select: {
        id: true,
        provider: true,
        providerCheckoutUrl: true,
        providerSubscriptionId: true,
        providerPaymentId: true,
        providerReference: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let providerSetup:
      | ReturnType<typeof getClubBillingProviderFromTenant>
      | undefined;

    try {
      providerSetup = getClubBillingProviderFromTenant(tenant, {
        asaasApiKey: tenant.clubAsaasApiKeyEnc
          ? decryptSecret(tenant.clubAsaasApiKeyEnc)
          : null,
        mercadoPagoAccessToken: tenant.clubMercadoPagoAccessTokenEnc
          ? decryptSecret(tenant.clubMercadoPagoAccessTokenEnc)
          : null,
        mercadoPagoPublicKey: tenant.clubMercadoPagoPublicKey,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Configuração de pagamento inválida.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let subscriptionId = pendingSubscription?.id;

    if (!subscriptionId) {
      const createdSubscription = await prisma.clubSubscription.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          planId: plan.id,
          provider: providerSetup.provider,
          status: "PENDING",
        },
        select: {
          id: true,
        },
      });

      subscriptionId = createdSubscription.id;
    } else if (
      pendingSubscription &&
      pendingSubscription.provider !== providerSetup.provider
    ) {
      await prisma.clubSubscription.update({
        where: { id: subscriptionId },
        data: {
          provider: providerSetup.provider,
          providerCustomerId: null,
          providerSubscriptionId: null,
          providerPaymentId: null,
          providerCheckoutUrl: null,
          providerStatusRaw: null,
          providerReference: null,
          lastProviderSyncAt: null,
        },
      });
    }

    const externalReference =
      pendingSubscription?.providerReference ||
      `clubsub:${tenant.id}:${subscriptionId}`;

    const returnUrl = buildPortalReturnUrl(request, slug);
    const notificationUrl = buildNotificationUrl(
      request,
      providerSetup.provider
    );

    const providerResult = await providerSetup.adapter.createSubscription({
      providerConfig: providerSetup.config,
      planId: plan.id,
      planName: plan.name,
      priceInCents: plan.priceInCents,
      billingCycle: plan.billingCycle,
      customer: {
        clientId: client.id,
        name: client.name,
        phoneE164: client.phoneE164,
        email: client.email,
      },
      externalReference,
      returnUrl,
      notificationUrl,
      description: plan.description,
    });

    const updatedSubscription = await prisma.clubSubscription.update({
      where: { id: subscriptionId },
      data: {
        provider: providerResult.provider,
        status: "PENDING",
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
        status: true,
        provider: true,
        providerCheckoutUrl: true,
        providerSubscriptionId: true,
        providerReference: true,
      },
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        provider: updatedSubscription.provider,
        planId: plan.id,
        planName: plan.name,
        checkoutUrl: updatedSubscription.providerCheckoutUrl,
        providerSubscriptionId: updatedSubscription.providerSubscriptionId,
        providerReference: updatedSubscription.providerReference,
      },
      nextStep: updatedSubscription.providerCheckoutUrl
        ? "REDIRECT_TO_CHECKOUT"
        : "PAYMENT_PENDING",
    });
  } catch (error) {
    console.error("[CLUB_SUBSCRIBE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
