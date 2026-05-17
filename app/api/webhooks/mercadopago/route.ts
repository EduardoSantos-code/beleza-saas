import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { mercadoPagoClubBillingProvider } from "@/lib/club-billing/mercadopago";
import type {
  ClubBillingMercadoPagoConfig,
  ClubBillingWebhookEvent,
  NormalizedClubSubscriptionState,
} from "@/lib/club-billing/types";

function headersToRecord(
  headers: Headers
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function searchParamsToRecord(
  searchParams: URLSearchParams
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};

  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);

    if (values.length === 1) {
      result[key] = values[0];
    } else if (values.length > 1) {
      result[key] = values;
    }
  }

  return result;
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const arr: Array<Prisma.InputJsonValue | null> = [];

    for (const item of value) {
      arr.push(item === null ? null : toPrismaJsonValue(item));
    }

    return arr as Prisma.InputJsonArray;
  }

  if (typeof value === "object" && value !== null) {
    const obj: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined) continue;
      obj[key] = entry === null ? null : toPrismaJsonValue(entry);
    }

    return obj as Prisma.InputJsonObject;
  }

  return String(value);
}

function toPrismaJsonField(
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  if (value === null) return Prisma.JsonNull;
  return toPrismaJsonValue(value);
}

async function findExistingWebhookEvent(event: ClubBillingWebhookEvent) {
  if (!event.externalEventId) {
    return null;
  }

  return prisma.clubBillingWebhookEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider: "MERCADO_PAGO",
        externalEventId: event.externalEventId,
      },
    },
  });
}

async function createOrRefreshWebhookEvent(
  event: ClubBillingWebhookEvent,
  payload: unknown
) {
  const existing = await findExistingWebhookEvent(event);

  if (existing?.processed) {
    return {
      duplicateProcessed: true,
      record: existing,
    };
  }

  if (existing) {
    const updated = await prisma.clubBillingWebhookEvent.update({
      where: { id: existing.id },
      data: {
        topic: event.topic ?? undefined,
        action: event.action ?? undefined,
        resourceId: event.resourceId ?? undefined,
        providerReference: event.providerReference ?? undefined,
        payload: toPrismaJsonField(payload),
        error: null,
      },
    });

    return {
      duplicateProcessed: false,
      record: updated,
    };
  }

  const created = await prisma.clubBillingWebhookEvent.create({
    data: {
      provider: "MERCADO_PAGO",
      externalEventId: event.externalEventId ?? null,
      topic: event.topic ?? null,
      action: event.action ?? null,
      resourceId: event.resourceId ?? null,
      providerReference: event.providerReference ?? null,
      payload: toPrismaJsonField(
        typeof payload === "object" && payload !== null
          ? payload
          : { raw: String(payload) }
      ),
      processed: false,
    },
  });

  return {
    duplicateProcessed: false,
    record: created,
  };
}

async function resolveSubscription(event: ClubBillingWebhookEvent) {
  const orFilters: Array<{
    providerSubscriptionId?: string;
    providerPaymentId?: string;
    providerReference?: string;
  }> = [];

  if (event.resourceId) {
    orFilters.push({ providerSubscriptionId: event.resourceId });
    orFilters.push({ providerPaymentId: event.resourceId });
  }

  if (event.providerReference) {
    orFilters.push({ providerReference: event.providerReference });
  }

  if (orFilters.length === 0) {
    return null;
  }

  return prisma.clubSubscription.findFirst({
    where: {
      provider: "MERCADO_PAGO",
      OR: orFilters,
    },
    select: {
      id: true,
      provider: true,
      providerCustomerId: true,
      providerSubscriptionId: true,
      providerPaymentId: true,
      providerCheckoutUrl: true,
      providerStatusRaw: true,
      providerReference: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      canceledAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          clubMercadoPagoAccessTokenEnc: true,
          clubMercadoPagoPublicKey: true,
          clubMercadoPagoEnvironment: true,
        },
      },
    },
  });
}

function buildProviderConfig(subscription: {
  tenant: {
    id: string;
    name: string;
    slug: string;
    clubMercadoPagoAccessTokenEnc: string | null;
    clubMercadoPagoPublicKey: string | null;
    clubMercadoPagoEnvironment: "SANDBOX" | "PRODUCTION";
  };
}): ClubBillingMercadoPagoConfig {
  const encryptedAccessToken =
    subscription.tenant.clubMercadoPagoAccessTokenEnc;

  if (!encryptedAccessToken) {
    throw new Error(
      `Tenant ${subscription.tenant.slug} sem access token do Mercado Pago configurado.`
    );
  }

  return {
    provider: "MERCADO_PAGO",
    tenantId: subscription.tenant.id,
    tenantName: subscription.tenant.name,
    tenantSlug: subscription.tenant.slug,
    environment: subscription.tenant.clubMercadoPagoEnvironment,
    accessToken: decryptSecret(encryptedAccessToken),
    publicKey: subscription.tenant.clubMercadoPagoPublicKey,
  };
}

async function fetchNormalizedState(
  subscription: {
    providerSubscriptionId: string | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
      clubMercadoPagoAccessTokenEnc: string | null;
      clubMercadoPagoPublicKey: string | null;
      clubMercadoPagoEnvironment: "SANDBOX" | "PRODUCTION";
    };
  },
  event: ClubBillingWebhookEvent
): Promise<NormalizedClubSubscriptionState | null> {
  const providerSubscriptionId =
    subscription.providerSubscriptionId ||
    (event.topic === "subscription_preapproval" ? event.resourceId : null);

  if (!providerSubscriptionId) {
    return null;
  }

  const providerConfig = buildProviderConfig(subscription);

  return mercadoPagoClubBillingProvider.getSubscription({
    providerConfig,
    providerSubscriptionId,
  });
}

async function markWebhookProcessed(
  webhookEventId: string,
  data: {
    tenantId?: string | null;
    subscriptionId?: string | null;
    error?: string | null;
  } = {}
) {
  await prisma.clubBillingWebhookEvent.update({
    where: { id: webhookEventId },
    data: {
      tenantId: data.tenantId ?? undefined,
      subscriptionId: data.subscriptionId ?? undefined,
      processed: true,
      processedAt: new Date(),
      error: data.error ?? null,
    },
  });
}

async function markWebhookFailed(
  webhookEventId: string,
  error: string,
  data: {
    tenantId?: string | null;
    subscriptionId?: string | null;
  } = {}
) {
  await prisma.clubBillingWebhookEvent.update({
    where: { id: webhookEventId },
    data: {
      tenantId: data.tenantId ?? undefined,
      subscriptionId: data.subscriptionId ?? undefined,
      processed: false,
      error,
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const url = new URL(request.url);

  try {
    const webhookResolution =
      await mercadoPagoClubBillingProvider.verifyAndParseWebhook({
        headers: headersToRecord(request.headers),
        body: rawBody,
        query: searchParamsToRecord(url.searchParams),
      });

    const payload = (() => {
      try {
        return JSON.parse(rawBody) as unknown;
      } catch {
        return { raw: rawBody };
      }
    })();

    const webhookStore = await createOrRefreshWebhookEvent(
      webhookResolution.event,
      payload
    );

    if (webhookStore.duplicateProcessed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const webhookRecord = webhookStore.record;

    const subscription = await resolveSubscription(webhookResolution.event);

    if (!subscription) {
      await markWebhookProcessed(webhookRecord.id, {
        error: "Assinatura local não encontrada para este webhook.",
      });

      console.warn("[MERCADOPAGO_CLUB_WEBHOOK_SUBSCRIPTION_NOT_FOUND]", {
        topic: webhookResolution.event.topic,
        action: webhookResolution.event.action,
        resourceId: webhookResolution.event.resourceId,
        externalEventId: webhookResolution.event.externalEventId,
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "subscription_not_found",
      });
    }

    let normalizedState = webhookResolution.state;

    if (!normalizedState) {
      normalizedState = await fetchNormalizedState(
        subscription,
        webhookResolution.event
      );
    }

    if (!normalizedState) {
      await markWebhookProcessed(webhookRecord.id, {
        tenantId: subscription.tenant.id,
        subscriptionId: subscription.id,
        error:
          "Webhook recebido, mas sem dados suficientes para reconciliar a assinatura.",
      });

      console.warn("[MERCADOPAGO_CLUB_WEBHOOK_STATE_NOT_RESOLVED]", {
        tenantSlug: subscription.tenant.slug,
        subscriptionId: subscription.id,
        topic: webhookResolution.event.topic,
        action: webhookResolution.event.action,
        resourceId: webhookResolution.event.resourceId,
        externalEventId: webhookResolution.event.externalEventId,
      });

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "state_not_resolved",
      });
    }

    const updatedSubscription = await prisma.clubSubscription.update({
      where: { id: subscription.id },
      data: {
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
        lastWebhookAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        providerSubscriptionId: true,
        providerReference: true,
        tenantId: true,
      },
    });

    await markWebhookProcessed(webhookRecord.id, {
      tenantId: subscription.tenant.id,
      subscriptionId: updatedSubscription.id,
    });

    console.info("[MERCADOPAGO_CLUB_WEBHOOK_PROCESSED]", {
      tenantSlug: subscription.tenant.slug,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      providerSubscriptionId: updatedSubscription.providerSubscriptionId,
      topic: webhookResolution.event.topic,
      action: webhookResolution.event.action,
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        providerSubscriptionId: updatedSubscription.providerSubscriptionId,
        providerReference: updatedSubscription.providerReference,
      },
    });
  } catch (error) {
    console.error("[MERCADOPAGO_CLUB_WEBHOOK_ERROR]", error);

    try {
      const payload = (() => {
        try {
          return JSON.parse(rawBody) as unknown;
        } catch {
          return { raw: rawBody };
        }
      })();

      const externalEventId =
        typeof payload === "object" &&
        payload !== null &&
        "id" in payload &&
        (typeof payload.id === "string" || typeof payload.id === "number")
          ? String(payload.id)
          : null;

      if (externalEventId) {
        const existing = await prisma.clubBillingWebhookEvent.findUnique({
          where: {
            provider_externalEventId: {
              provider: "MERCADO_PAGO",
              externalEventId,
            },
          },
        });

        if (existing) {
          await markWebhookFailed(
            existing.id,
            error instanceof Error ? error.message : "Erro ao processar webhook."
          );
        }
      }
    } catch (secondaryError) {
      console.error(
        "[MERCADOPAGO_CLUB_WEBHOOK_ERROR_SECONDARY]",
        secondaryError
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook do Mercado Pago.",
      },
      { status: 400 }
    );
  }
}

export const dynamic = "force-dynamic";
