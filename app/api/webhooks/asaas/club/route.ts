import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getClubBillingProviderFromTenant } from "@/lib/club-billing";
import { asaasClubBillingProvider } from "@/lib/club-billing/asaas";
import type {
  ClubBillingWebhookEvent,
  NormalizedClubSubscriptionState,
} from "@/lib/club-billing/types";

export const dynamic = "force-dynamic";

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function headersToRecord(
  headers: Headers
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function extractSubscriptionIdFromReference(reference: string | null): string | null {
  if (!reference) return null;

  if (reference.startsWith("clubsub:")) {
    const parts = reference.split(":");
    return parts[2] || null;
  }

  if (reference.startsWith("club_subscription:")) {
    return reference.replace("club_subscription:", "") || null;
  }

  return null;
}

async function findExistingWebhookEvent(event: ClubBillingWebhookEvent) {
  if (!event.externalEventId) {
    return null;
  }

  return prisma.clubBillingWebhookEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider: "ASAAS",
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
        topic: event.topic ?? null,
        action: event.action ?? null,
        resourceId: event.resourceId ?? null,
        payload:
          typeof payload === "object" && payload !== null
            ? (payload as object)
            : { raw: payload },
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
      provider: "ASAAS",
      externalEventId: event.externalEventId ?? null,
      topic: event.topic ?? null,
      action: event.action ?? null,
      resourceId: event.resourceId ?? null,
      payload:
        typeof payload === "object" && payload !== null
          ? (payload as object)
          : { raw: payload },
      processed: false,
    },
  });

  return {
    duplicateProcessed: false,
    record: created,
  };
}

async function resolveSubscription(event: ClubBillingWebhookEvent) {
  const subscriptionIdFromReference = extractSubscriptionIdFromReference(
    event.providerReference ?? null
  );

  if (subscriptionIdFromReference) {
    const directMatch = await prisma.clubSubscription.findUnique({
      where: { id: subscriptionIdFromReference },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            clubPaymentProvider: true,
            clubAsaasApiKeyEnc: true,
            clubAsaasEnvironment: true,
            clubMercadoPagoAccessTokenEnc: true,
            clubMercadoPagoPublicKey: true,
            clubMercadoPagoEnvironment: true,
          },
        },
      },
    });

    if (directMatch) {
      return directMatch;
    }
  }

  const orFilters: Array<{
    providerReference?: string;
    providerSubscriptionId?: string;
    providerPaymentId?: string;
  }> = [];

  if (event.providerReference) {
    orFilters.push({ providerReference: event.providerReference });
  }

  if (event.resourceId) {
    orFilters.push({ providerSubscriptionId: event.resourceId });
    orFilters.push({ providerPaymentId: event.resourceId });
  }

  if (orFilters.length === 0) {
    return null;
  }

  return prisma.clubSubscription.findFirst({
    where: {
      provider: "ASAAS",
      OR: orFilters,
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          clubPaymentProvider: true,
          clubAsaasApiKeyEnc: true,
          clubAsaasEnvironment: true,
          clubMercadoPagoAccessTokenEnc: true,
          clubMercadoPagoPublicKey: true,
          clubMercadoPagoEnvironment: true,
        },
      },
    },
  });
}

async function fetchNormalizedState(
  subscription: {
    providerSubscriptionId: string | null;
    provider: "ASAAS" | "MERCADO_PAGO";
    tenant: {
      id: string;
      name: string;
      slug: string;
      clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
      clubAsaasApiKeyEnc: string | null;
      clubAsaasEnvironment: "SANDBOX" | "PRODUCTION";
      clubMercadoPagoAccessTokenEnc: string | null;
      clubMercadoPagoPublicKey: string | null;
      clubMercadoPagoEnvironment: "SANDBOX" | "PRODUCTION";
    };
  }
): Promise<NormalizedClubSubscriptionState | null> {
  if (!subscription.providerSubscriptionId) {
    return null;
  }

  const providerSetup = getClubBillingProviderFromTenant(
    {
      id: subscription.tenant.id,
      name: subscription.tenant.name,
      slug: subscription.tenant.slug,
      clubPaymentProvider: subscription.provider,
      clubAsaasEnvironment: subscription.tenant.clubAsaasEnvironment,
      clubMercadoPagoEnvironment: subscription.tenant.clubMercadoPagoEnvironment,
    },
    {
      asaasApiKey: subscription.tenant.clubAsaasApiKeyEnc
        ? decryptSecret(subscription.tenant.clubAsaasApiKeyEnc)
        : null,
      mercadoPagoAccessToken: subscription.tenant.clubMercadoPagoAccessTokenEnc
        ? decryptSecret(subscription.tenant.clubMercadoPagoAccessTokenEnc)
        : null,
      mercadoPagoPublicKey: subscription.tenant.clubMercadoPagoPublicKey,
    }
  );

  return providerSetup.adapter.getSubscription({
    providerConfig: providerSetup.config,
    providerSubscriptionId: subscription.providerSubscriptionId,
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

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "asaas-club-webhook",
    scope: "club",
    message: "Webhook Asaas do clube ativo. Use POST para enviar eventos.",
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const payload = safeJsonParse(rawBody);

  try {
    const webhookResolution = await asaasClubBillingProvider.verifyAndParseWebhook(
      {
        headers: headersToRecord(req.headers),
        body: rawBody,
      }
    );

    const webhookStore = await createOrRefreshWebhookEvent(
      webhookResolution.event,
      payload
    );

    if (webhookStore.duplicateProcessed) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    const webhookRecord = webhookStore.record;
    const subscription = await resolveSubscription(webhookResolution.event);

    if (!subscription) {
      await markWebhookProcessed(webhookRecord.id, {
        error: "Assinatura local não encontrada para este webhook.",
      });

      return NextResponse.json(
        {
          ok: true,
          ignored: true,
          reason: "subscription_not_found",
        },
        { status: 200 }
      );
    }

    let normalizedState = webhookResolution.state;

    if (!normalizedState) {
      normalizedState = await fetchNormalizedState(subscription);
    }

    if (!normalizedState) {
      await markWebhookProcessed(webhookRecord.id, {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        error:
          "Webhook recebido, mas sem dados suficientes para reconciliar a assinatura.",
      });

      return NextResponse.json(
        {
          ok: true,
          ignored: true,
          reason: "state_not_resolved",
        },
        { status: 200 }
      );
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
        providerPaymentId: true,
        providerReference: true,
      },
    });

    await markWebhookProcessed(webhookRecord.id, {
      tenantId: subscription.tenantId,
      subscriptionId: updatedSubscription.id,
    });

    return NextResponse.json(
      {
        ok: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          providerSubscriptionId: updatedSubscription.providerSubscriptionId,
          providerPaymentId: updatedSubscription.providerPaymentId,
          providerReference: updatedSubscription.providerReference,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ASAAS_CLUB_WEBHOOK_ERROR]",
      error instanceof Error ? error.message : error
    );

    try {
      const bodyAsObject =
        typeof payload === "object" && payload !== null ? payload : null;

      const externalEventId =
        bodyAsObject && "id" in bodyAsObject
          ? normalizeString((bodyAsObject as { id?: unknown }).id)
          : null;

      if (externalEventId) {
        const existing = await prisma.clubBillingWebhookEvent.findUnique({
          where: {
            provider_externalEventId: {
              provider: "ASAAS",
              externalEventId,
            },
          },
        });

        if (existing) {
          await markWebhookFailed(
            existing.id,
            error instanceof Error
              ? error.message
              : "Erro ao processar webhook do Asaas."
          );
        }
      }
    } catch (secondaryError) {
      console.error(
        "[ASAAS_CLUB_WEBHOOK_ERROR_SECONDARY]",
        secondaryError
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar webhook do Asaas.",
      },
      { status: 400 }
    );
  }
}
