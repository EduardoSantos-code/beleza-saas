import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getClubBillingProviderFromTenant } from "@/lib/club-billing";

export const dynamic = "force-dynamic";

type ReconcileStats = {
  scanned: number;
  reconciled: number;
  updated: number;
  expiredLocally: number;
  errors: number;
};

function isAuthorized(request: Request, cronSecret: string): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const url = new URL(request.url);
  const cronKey = url.searchParams.get("key");
  return cronKey === cronSecret;
}


async function reconcileSubscription(subscription: {
  id: string;
  provider: "ASAAS" | "MERCADO_PAGO";
  status: "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELED" | "EXPIRED";
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPaymentId: string | null;
  providerCheckoutUrl: string | null;
  providerStatusRaw: string | null;
  providerReference: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    clubAsaasApiKeyEnc: string | null;
    clubAsaasEnvironment: "SANDBOX" | "PRODUCTION";
    clubMercadoPagoAccessTokenEnc: string | null;
    clubMercadoPagoPublicKey: string | null;
    clubMercadoPagoEnvironment: "SANDBOX" | "PRODUCTION";
  };
}) {
  if (!subscription.providerSubscriptionId) {
    return {
      skipped: true,
      updated: false,
      reason: "missing_provider_subscription_id",
    } as const;
  }

  const providerSetup = getClubBillingProviderFromTenant(
    {
      id: subscription.tenant.id,
      name: subscription.tenant.name,
      slug: subscription.tenant.slug,
      clubPaymentProvider: subscription.provider,
      clubAsaasEnvironment: subscription.tenant.clubAsaasEnvironment,
      clubMercadoPagoEnvironment:
        subscription.tenant.clubMercadoPagoEnvironment,
    },
    {
      asaasApiKey: subscription.tenant.clubAsaasApiKeyEnc
        ? decryptSecret(subscription.tenant.clubAsaasApiKeyEnc)
        : null,
      mercadoPagoAccessToken: subscription.tenant
        .clubMercadoPagoAccessTokenEnc
        ? decryptSecret(subscription.tenant.clubMercadoPagoAccessTokenEnc)
        : null,
      mercadoPagoPublicKey: subscription.tenant.clubMercadoPagoPublicKey,
    }
  );

  const normalizedState = await providerSetup.adapter.getSubscription({
    providerConfig: providerSetup.config,
    providerSubscriptionId: subscription.providerSubscriptionId,
  });

  const nextData = {
    providerCustomerId:
      normalizedState.providerCustomerId ??
      subscription.providerCustomerId ??
      null,
    providerSubscriptionId:
      normalizedState.providerSubscriptionId ??
      subscription.providerSubscriptionId ??
      null,
    providerPaymentId:
      normalizedState.providerPaymentId ??
      subscription.providerPaymentId ??
      null,
    providerCheckoutUrl:
      normalizedState.providerCheckoutUrl ??
      subscription.providerCheckoutUrl ??
      null,
    providerStatusRaw:
      normalizedState.providerStatusRaw ??
      subscription.providerStatusRaw ??
      null,
    providerReference:
      normalizedState.providerReference ??
      subscription.providerReference ??
      null,
    status: normalizedState.status,
    currentPeriodStart:
      normalizedState.currentPeriodStart ??
      subscription.currentPeriodStart ??
      null,
    currentPeriodEnd:
      normalizedState.currentPeriodEnd ??
      subscription.currentPeriodEnd ??
      null,
    canceledAt:
      normalizedState.canceledAt ?? subscription.canceledAt ?? null,
    lastProviderSyncAt: new Date(),
  } as const;

  const changed =
    nextData.providerCustomerId !== subscription.providerCustomerId ||
    nextData.providerSubscriptionId !== subscription.providerSubscriptionId ||
    nextData.providerPaymentId !== subscription.providerPaymentId ||
    nextData.providerCheckoutUrl !== subscription.providerCheckoutUrl ||
    nextData.providerStatusRaw !== subscription.providerStatusRaw ||
    nextData.providerReference !== subscription.providerReference ||
    nextData.status !== subscription.status ||
    (nextData.currentPeriodStart?.getTime() ?? null) !==
      (subscription.currentPeriodStart?.getTime() ?? null) ||
    (nextData.currentPeriodEnd?.getTime() ?? null) !==
      (subscription.currentPeriodEnd?.getTime() ?? null) ||
    (nextData.canceledAt?.getTime() ?? null) !==
      (subscription.canceledAt?.getTime() ?? null);

  if (!changed) {
    await prisma.clubSubscription.update({
      where: { id: subscription.id },
      data: {
        lastProviderSyncAt: nextData.lastProviderSyncAt,
      },
      select: { id: true },
    });

    return {
      skipped: false,
      updated: false,
      reason: "already_synced",
    } as const;
  }

  await prisma.clubSubscription.update({
    where: { id: subscription.id },
    data: nextData,
    select: { id: true },
  });

  return {
    skipped: false,
    updated: true,
    reason: "updated",
  } as const;
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "[CLUB_SUBSCRIPTIONS_RECONCILE_CRON_ERROR] CRON_SECRET não configurado."
      );
      return NextResponse.json(
        { error: "CRON_SECRET não configurado." },
        { status: 500 }
      );
    }

    if (!isAuthorized(request, cronSecret)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const subscriptions = await prisma.clubSubscription.findMany({
      where: {
        status: {
          in: ["PENDING", "ACTIVE", "OVERDUE"],
        },
        providerSubscriptionId: {
          not: null,
        },
      },
      select: {
        id: true,
        provider: true,
        status: true,
        providerCustomerId: true,
        providerSubscriptionId: true,
        providerPaymentId: true,
        providerCheckoutUrl: true,
        providerStatusRaw: true,
        providerReference: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        canceledAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            clubAsaasApiKeyEnc: true,
            clubAsaasEnvironment: true,
            clubMercadoPagoAccessTokenEnc: true,
            clubMercadoPagoPublicKey: true,
            clubMercadoPagoEnvironment: true,
          },
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    const stats: ReconcileStats = {
      scanned: subscriptions.length,
      reconciled: 0,
      updated: 0,
      expiredLocally: 0,
      errors: 0,
    };

    const errors: Array<{ subscriptionId: string; error: string }> = [];

    for (const subscription of subscriptions) {
      try {
        const result = await reconcileSubscription(subscription);
        stats.reconciled += 1;

        if (result.updated) {
          stats.updated += 1;
        }
      } catch (error) {
        stats.errors += 1;
        errors.push({
          subscriptionId: subscription.id,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao reconciliar assinatura.",
        });

        console.error("[CLUB_SUBSCRIPTION_RECONCILE_ITEM_ERROR]", {
          subscriptionId: subscription.id,
          provider: subscription.provider,
          error,
        });
      }
    }

    const now = new Date();

    const localExpireResult = await prisma.clubSubscription.updateMany({
      where: {
        status: "ACTIVE",
        providerSubscriptionId: null,
        currentPeriodEnd: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    stats.expiredLocally = localExpireResult.count;

    const executedAt = new Date().toISOString();

    console.log("[CLUB_SUBSCRIPTIONS_RECONCILE_CRON]", {
      ...stats,
      executedAt,
      errors,
    });

    return NextResponse.json({
      ok: true,
      ...stats,
      executedAt,
      errors,
    });
  } catch (error) {
    console.error("[CLUB_SUBSCRIPTIONS_RECONCILE_CRON_ERROR]", error);
    return NextResponse.json(
      { error: "Não foi possível reconciliar as assinaturas do clube." },
      { status: 500 }
    );
  }
}
