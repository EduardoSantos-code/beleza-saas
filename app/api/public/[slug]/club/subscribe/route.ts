import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getClubBillingProviderFromTenant } from "@/lib/club-billing";
import { ClubSubscriptionStatus } from "@prisma/client";

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

function getSessionSecret() {
  return (
    process.env.CLIENT_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-only-client-session-secret"
      : "")
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

function isSubscriptionUsableNow(
  currentPeriodEnd: Date | null,
  now = new Date()
) {
  if (!currentPeriodEnd) return true;
  return endOfUtcDay(currentPeriodEnd) >= now;
}

function pickUsableActiveSubscription<
  T extends {
    id: string;
    currentPeriodEnd: Date | null;
    createdAt: Date;
    updatedAt: Date;
    plan: {
      id: string;
      name: string;
    };
  }
>(subscriptions: T[], now = new Date()) {
  const usable = subscriptions.filter((sub) =>
    isSubscriptionUsableNow(sub.currentPeriodEnd, now)
  );

  usable.sort((a, b) => {
    const aEnd = a.currentPeriodEnd
      ? endOfUtcDay(a.currentPeriodEnd).getTime()
      : Number.MAX_SAFE_INTEGER;

    const bEnd = b.currentPeriodEnd
      ? endOfUtcDay(b.currentPeriodEnd).getTime()
      : Number.MAX_SAFE_INTEGER;

    if (bEnd !== aEnd) return bEnd - aEnd;

    const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (updatedDiff !== 0) return updatedDiff;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return usable[0] ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const { slug } = await params;

    let body: SubscribeBody;
    try {
      body = (await request.json()) as SubscribeBody;
    } catch {
      return NextResponse.json({ error: "Body inválido." }, { status: 400 });
    }

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
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
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

    const sessionSecret = getSessionSecret();

    if (!sessionSecret) {
      console.error(`[CLUB_SUBSCRIBE][${requestId}] missing session secret`);
      return NextResponse.json(
        { error: "Erro interno de configuração." },
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
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
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

    const activeSubscriptions = await prisma.clubSubscription.findMany({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        status: ClubSubscriptionStatus.ACTIVE,
      },
      select: {
        id: true,
        status: true,
        provider: true,
        providerCheckoutUrl: true,
        providerSubscriptionId: true,
        providerReference: true,
        currentPeriodEnd: true,
        createdAt: true,
        updatedAt: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const activeSubscription = pickUsableActiveSubscription(activeSubscriptions);

    if (activeSubscription) {
      if (activeSubscription.plan.id === plan.id) {
        return NextResponse.json({
          ok: true,
          subscription: {
            id: activeSubscription.id,
            status: activeSubscription.status,
            provider: activeSubscription.provider,
            planId: activeSubscription.plan.id,
            planName: activeSubscription.plan.name,
            checkoutUrl: activeSubscription.providerCheckoutUrl,
          },
          nextStep: "SUBSCRIPTION_ACTIVE",
          message: "Você já possui uma assinatura ativa deste plano.",
        });
      }

      return NextResponse.json(
        {
          error: `Você já possui uma assinatura ativa no clube (${activeSubscription.plan.name}). Cancele ou altere a assinatura atual antes de contratar outro plano.`,
          currentSubscription: {
            id: activeSubscription.id,
            planId: activeSubscription.plan.id,
            planName: activeSubscription.plan.name,
            status: activeSubscription.status,
          },
        },
        { status: 409 }
      );
    }

    const pendingSubscription = await prisma.clubSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        planId: plan.id,
        status: ClubSubscriptionStatus.PENDING,
      },
      select: {
        id: true,
        provider: true,
        providerCheckoutUrl: true,
        providerSubscriptionId: true,
        providerPaymentId: true,
        providerReference: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    if (
      pendingSubscription &&
      pendingSubscription.providerCheckoutUrl &&
      pendingSubscription.provider === providerSetup.provider
    ) {
      return NextResponse.json({
        ok: true,
        subscription: {
          id: pendingSubscription.id,
          status: "PENDING",
          provider: pendingSubscription.provider,
          planId: plan.id,
          planName: plan.name,
          checkoutUrl: pendingSubscription.providerCheckoutUrl,
          providerSubscriptionId: pendingSubscription.providerSubscriptionId,
          providerReference: pendingSubscription.providerReference,
        },
        nextStep: "REDIRECT_TO_CHECKOUT",
        resumedPending: true,
      });
    }

    if (
      pendingSubscription &&
      pendingSubscription.providerSubscriptionId &&
      !pendingSubscription.providerCheckoutUrl &&
      pendingSubscription.provider === providerSetup.provider
    ) {
      return NextResponse.json(
        {
          error:
            "Já existe uma assinatura pendente iniciada para este plano, mas o link de pagamento não está disponível. Verifique o estado no painel administrativo.",
          subscription: {
            id: pendingSubscription.id,
            status: "PENDING",
            provider: pendingSubscription.provider,
            planId: plan.id,
            planName: plan.name,
          },
        },
        { status: 409 }
      );
    }

    let subscriptionId: string;

    if (!pendingSubscription) {
      const createdSubscription = await prisma.clubSubscription.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          planId: plan.id,
          provider: providerSetup.provider,
          status: ClubSubscriptionStatus.PENDING,
        },
        select: {
          id: true,
        },
      });

      subscriptionId = createdSubscription.id;
    } else {
      subscriptionId = pendingSubscription.id;

      if (pendingSubscription.provider !== providerSetup.provider) {
      await prisma.clubSubscription.update({
          where: { id: pendingSubscription.id },
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
    }

    const subscription = await prisma.clubSubscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        status: true,
        provider: true,
        providerCheckoutUrl: true,
        providerSubscriptionId: true,
        providerReference: true,
      },
    });

    if (!subscription) {
      console.error(
        `[CLUB_SUBSCRIBE][${requestId}] subscription missing after create/update`,
        {
          tenantId: tenant.id,
          clientId: client.id,
          planId: plan.id,
          subscriptionId,
        }
      );

      return NextResponse.json(
        { error: "Não foi possível iniciar a assinatura." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        provider: subscription.provider,
        planId: plan.id,
        planName: plan.name,
        checkoutUrl: subscription.providerCheckoutUrl,
        providerSubscriptionId: subscription.providerSubscriptionId,
        providerReference: subscription.providerReference,
      },
      nextStep: subscription.providerCheckoutUrl
        ? "REDIRECT_TO_CHECKOUT"
        : "CONTINUE_TO_CHECKOUT",
    });
  } catch (error) {
    console.error("[CLUB_SUBSCRIBE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
