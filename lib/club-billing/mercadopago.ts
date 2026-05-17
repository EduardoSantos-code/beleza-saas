import { createHmac } from "node:crypto";
import type { ClubSubscriptionStatus } from "@prisma/client";
import {
  assertProviderConfig,
  clubBillingCycleToMonths,
  type CancelClubSubscriptionInput,
  type CancelClubSubscriptionResult,
  type ClubBillingProvider,
  type ClubBillingProviderConfig,
  type ClubBillingWebhookEvent,
  type ClubBillingWebhookInput,
  type ClubBillingWebhookResolution,
  type CreateClubSubscriptionInput,
  type CreateClubSubscriptionResult,
  type GetClubSubscriptionInput,
  type NormalizedClubSubscriptionState,
} from "./types";

type MercadoPagoAutoRecurring = {
  frequency?: number;
  frequency_type?: string;
  start_date?: string;
  end_date?: string;
  currency_id?: string;
  transaction_amount?: number;
};

type MercadoPagoPreapprovalResponse = {
  id?: string;
  status?: string;
  external_reference?: string | number | null;
  payer_id?: string | number | null;
  card_id?: string | number | null;
  payment_method_id?: string | null;
  init_point?: string | null;
  back_url?: string | null;
  reason?: string | null;
  date_created?: string | null;
  last_modified?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: MercadoPagoAutoRecurring | null;
  [key: string]: unknown;
};

type MercadoPagoWebhookBody = {
  id?: string | number;
  live_mode?: boolean;
  type?: string;
  date_created?: string;
  user_id?: string | number;
  api_version?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
  [key: string]: unknown;
};

const MERCADO_PAGO_API_BASE = "https://api.mercadopago.com";

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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

function normalizeDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toMercadoPagoAmount(priceInCents: number): number {
  return Number((priceInCents / 100).toFixed(2));
}

function mapMercadoPagoStatusToInternal(
  rawStatus: string | null | undefined
): ClubSubscriptionStatus {
  const status = (rawStatus || "").toLowerCase();

  switch (status) {
    case "authorized":
      return "ACTIVE";
    case "pending":
      return "PENDING";
    case "paused":
      return "OVERDUE";
    case "cancelled":
    case "canceled":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

function parseMercadoPagoSignature(
  signatureHeader: string | null
): { ts: string | null; v1: string | null } {
  if (!signatureHeader) {
    return { ts: null, v1: null };
  }

  const parts = signatureHeader.split(",");
  let ts: string | null = null;
  let v1: string | null = null;

  for (const rawPart of parts) {
    const [rawKey, rawValue] = rawPart.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();

    if (!key || !value) continue;
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }

  return { ts, v1 };
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const lowerKey = key.toLowerCase();

  for (const [headerKey, headerValue] of Object.entries(headers)) {
    if (headerKey.toLowerCase() !== lowerKey) continue;

    if (typeof headerValue === "string") {
      return headerValue;
    }

    if (Array.isArray(headerValue)) {
      return headerValue[0] ?? null;
    }
  }

  return null;
}

function getQueryValue(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | null {
  const value = query?.[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function buildWebhookManifest(dataId: string, requestId: string, ts: string) {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

function getMercadoPagoStartDate(minutesAhead = 10): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

function getWebhookSecret(): string | null {
  return (
    process.env.MERCADOPAGO_WEBHOOK_SECRET ||
    process.env.MP_WEBHOOK_SECRET ||
    null
  );
}

function normalizePreapprovalResponse(
  response: MercadoPagoPreapprovalResponse
): NormalizedClubSubscriptionState {
  const rawStatus = normalizeString(response.status);
  const externalReference = normalizeString(response.external_reference);

  return {
    provider: "MERCADO_PAGO",
    providerCustomerId: normalizeString(response.payer_id),
    providerSubscriptionId: normalizeString(response.id),
    providerPaymentId: null,
    providerCheckoutUrl: normalizeString(response.init_point),
    providerStatusRaw: rawStatus,
    providerReference: externalReference,
    status: mapMercadoPagoStatusToInternal(rawStatus),
    currentPeriodStart:
      normalizeDate(response.auto_recurring?.start_date) ||
      normalizeDate(response.date_created),
    currentPeriodEnd:
      normalizeDate(response.next_payment_date) ||
      normalizeDate(response.auto_recurring?.end_date),
    canceledAt:
      rawStatus === "canceled" || rawStatus === "cancelled"
        ? normalizeDate(response.last_modified)
        : null,
    raw: response,
  };
}

async function mpRequest<T>(
  providerConfig: ClubBillingProviderConfig,
  path: string,
  init: RequestInit
): Promise<T> {
  assertProviderConfig(providerConfig, "MERCADO_PAGO");

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${providerConfig.accessToken}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  const parsed = text ? safeJsonParse(text) : null;

  let errorMessage = `Mercado Pago request failed with status ${response.status}.`;

  if (parsed && typeof parsed === "object" && parsed !== null) {
    if (
      "message" in parsed &&
      typeof parsed.message === "string" &&
      parsed.message
    ) {
      errorMessage = parsed.message;
    } else if (
      "error" in parsed &&
      typeof parsed.error === "string" &&
      parsed.error
    ) {
      errorMessage = parsed.error;
    } else if (
      "cause" in parsed &&
      Array.isArray(parsed.cause) &&
      parsed.cause.length > 0
    ) {
      const firstCause = parsed.cause[0];
      if (
        firstCause &&
        typeof firstCause === "object" &&
        "description" in firstCause &&
        typeof firstCause.description === "string"
      ) {
        errorMessage = firstCause.description;
      }
    }
  }

  if (!response.ok) {
    console.error("[MERCADOPAGO_API_ERROR]", {
      path,
      status: response.status,
      errorMessage,
      parsed,
    });

    throw new Error(errorMessage);
  }

  return parsed as T;
}

export class MercadoPagoClubBillingProvider implements ClubBillingProvider {
  async createSubscription(
    input: CreateClubSubscriptionInput
  ): Promise<CreateClubSubscriptionResult> {
    assertProviderConfig(input.providerConfig, "MERCADO_PAGO");

    const frequency = clubBillingCycleToMonths(input.billingCycle);
    const amount = toMercadoPagoAmount(input.priceInCents);

    const payerEmail = input.customer.email?.trim().toLowerCase() || null;

    if (!payerEmail) {
      throw new Error(
        "E-mail do cliente é obrigatório para criar assinatura no Mercado Pago."
      );
    }

    if (!isValidEmail(payerEmail)) {
      throw new Error("E-mail do cliente inválido para o Mercado Pago.");
    }

    if (
      input.providerConfig.environment === "SANDBOX" &&
      !payerEmail.endsWith("@testuser.com")
    ) {
      throw new Error(
        "No ambiente de teste do Mercado Pago, o e-mail do assinante deve terminar com @testuser.com."
      );
    }

    const body = {
      reason:
        input.description?.trim() ||
        `${input.planName} - ${input.providerConfig.tenantName}`,
      external_reference: input.externalReference,
      payer_email: payerEmail,
      back_url: input.returnUrl || undefined,
      notification_url: input.notificationUrl || undefined,
      auto_recurring: {
        frequency,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL",
        start_date: getMercadoPagoStartDate(10),
      },
      status: "pending",
    };

    const response = await mpRequest<MercadoPagoPreapprovalResponse>(
      input.providerConfig,
      "/preapproval",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const normalized = normalizePreapprovalResponse(response);

    return {
      provider: "MERCADO_PAGO",
      providerCustomerId: normalized.providerCustomerId,
      providerSubscriptionId: normalized.providerSubscriptionId,
      providerPaymentId: normalized.providerPaymentId,
      providerCheckoutUrl: normalized.providerCheckoutUrl,
      providerStatusRaw: normalized.providerStatusRaw,
      providerReference: normalized.providerReference,
      raw: response,
    };
  }

  async cancelSubscription(
    input: CancelClubSubscriptionInput
  ): Promise<CancelClubSubscriptionResult> {
    assertProviderConfig(input.providerConfig, "MERCADO_PAGO");

    const response = await mpRequest<MercadoPagoPreapprovalResponse>(
      input.providerConfig,
      `/preapproval/${input.providerSubscriptionId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          status: "cancelled",
        }),
      }
    );

    const rawStatus = normalizeString(response.status);

    return {
      provider: "MERCADO_PAGO",
      canceled: rawStatus === "canceled" || rawStatus === "cancelled",
      providerStatusRaw: rawStatus,
      canceledAt: normalizeDate(response.last_modified),
      raw: response,
    };
  }

  async getSubscription(
    input: GetClubSubscriptionInput
  ): Promise<NormalizedClubSubscriptionState> {
    assertProviderConfig(input.providerConfig, "MERCADO_PAGO");

    const response = await mpRequest<MercadoPagoPreapprovalResponse>(
      input.providerConfig,
      `/preapproval/${input.providerSubscriptionId}`,
      {
        method: "GET",
      }
    );

    return normalizePreapprovalResponse(response);
  }

  async verifyAndParseWebhook(
    input: ClubBillingWebhookInput
  ): Promise<ClubBillingWebhookResolution> {
    const body = safeJsonParse(input.body) as MercadoPagoWebhookBody;
    const query = input.query || {};

    const queryDataId =
      getQueryValue(query, "data.id") ||
      getQueryValue(query, "id") ||
      getQueryValue(query, "resource.id");

    const bodyDataId =
      normalizeString(body?.data?.id) || normalizeString(body?.id);

    const dataId = queryDataId || bodyDataId;

    const xSignature = getHeaderValue(input.headers, "x-signature");
    const xRequestId = getHeaderValue(input.headers, "x-request-id");
    const secret = getWebhookSecret();

    if (xSignature) {
      const { ts, v1 } = parseMercadoPagoSignature(xSignature);

      if (!ts || !v1 || !xRequestId || !dataId) {
        throw new Error(
          "Webhook do Mercado Pago inválido: assinatura incompleta."
        );
      }

      if (!secret) {
        throw new Error(
          "MERCADOPAGO_WEBHOOK_SECRET não configurado para validar webhook."
        );
      }

      const manifest = buildWebhookManifest(dataId, xRequestId, ts);
      const expected = createHmac("sha256", secret)
        .update(manifest)
        .digest("hex");

      if (expected !== v1) {
        throw new Error("Assinatura do webhook do Mercado Pago inválida.");
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Webhook do Mercado Pago sem x-signature em ambiente de produção."
      );
    }

    const event: ClubBillingWebhookEvent = {
      provider: "MERCADO_PAGO",
      externalEventId: normalizeString(body?.id),
      topic:
        getQueryValue(query, "topic") ||
        getQueryValue(query, "type") ||
        normalizeString(body?.type),
      action: normalizeString(body?.action),
      resourceId: dataId,
      providerReference: null,
      raw: body,
    };

    return {
      event,
      state: null,
    };
  }
}

export const mercadoPagoClubBillingProvider =
  new MercadoPagoClubBillingProvider();
