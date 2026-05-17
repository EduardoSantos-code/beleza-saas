import type { ClubSubscriptionStatus } from "@prisma/client";
import {
  assertProviderConfig,
  type CancelClubSubscriptionInput,
  type CancelClubSubscriptionResult,
  type ClubBillingProvider,
  type ClubBillingWebhookEvent,
  type ClubBillingWebhookInput,
  type ClubBillingWebhookResolution,
  type CreateClubSubscriptionInput,
  type CreateClubSubscriptionResult,
  type GetClubSubscriptionInput,
  type NormalizedClubSubscriptionState,
} from "./types";

type AsaasCheckoutResponse = {
  id?: string;
  status?: string;
  link?: string | null;
  value?: number | null;
  externalReference?: string | null;
  customer?: string | null;
  subscription?: {
    cycle?: string | null;
    nextDueDate?: string | null;
    endDate?: string | null;
  } | null;
  [key: string]: unknown;
};

type AsaasSubscriptionResponse = {
  id?: string;
  customer?: string | null;
  value?: number | null;
  nextDueDate?: string | null;
  cycle?: string | null;
  description?: string | null;
  billingType?: string | null;
  deleted?: boolean;
  status?: string | null;
  externalReference?: string | null;
  dateCreated?: string | null;
  [key: string]: unknown;
};

type AsaasWebhookSubscription = {
  id?: string;
  customer?: string | null;
  nextDueDate?: string | null;
  cycle?: string | null;
  deleted?: boolean;
  status?: string | null;
  externalReference?: string | null;
  dateCreated?: string | null;
  [key: string]: unknown;
};

type AsaasWebhookPayment = {
  id?: string;
  customer?: string | null;
  subscription?: string | null;
  externalReference?: string | null;
  status?: string | null;
  dueDate?: string | null;
  originalDueDate?: string | null;
  confirmedDate?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  [key: string]: unknown;
};

type AsaasWebhookCheckout = {
  id?: string;
  status?: string | null;
  link?: string | null;
  customer?: string | null;
  externalReference?: string | null;
  subscription?: {
    cycle?: string | null;
    nextDueDate?: string | null;
    endDate?: string | null;
  } | null;
  [key: string]: unknown;
};

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  dateCreated?: string;
  payment?: AsaasWebhookPayment;
  subscription?: AsaasWebhookSubscription;
  checkout?: AsaasWebhookCheckout;
  [key: string]: unknown;
};

function getAsaasApiBase(environment: "SANDBOX" | "PRODUCTION"): string {
  return environment === "PRODUCTION"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

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

function centsToAsaasAmount(priceInCents: number): number {
  return Number((priceInCents / 100).toFixed(2));
}

function mapClubCycleToAsaasCycle(
  cycle: CreateClubSubscriptionInput["billingCycle"]
): "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY" {
  switch (cycle) {
    case "MONTHLY":
      return "MONTHLY";
    case "QUARTERLY":
      return "QUARTERLY";
    case "SEMIANNUAL":
      return "SEMIANNUALLY";
    case "YEARLY":
      return "YEARLY";
    default: {
      const exhaustiveCheck: never = cycle;
      throw new Error(`Ciclo do clube não suportado no Asaas: ${exhaustiveCheck}`);
    }
  }
}

function mapAsaasSubscriptionStatus(
  rawStatus: string | null | undefined,
  deleted?: boolean | null
): ClubSubscriptionStatus {
  if (deleted) {
    return "CANCELED";
  }

  const status = (rawStatus || "").toUpperCase();

  switch (status) {
    case "ACTIVE":
      return "ACTIVE";
    case "EXPIRED":
      return "EXPIRED";
    case "INACTIVE":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

function mapAsaasPaymentStatus(rawStatus: string | null | undefined): ClubSubscriptionStatus {
  const status = (rawStatus || "").toUpperCase();

  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return "ACTIVE";
    case "OVERDUE":
      return "OVERDUE";
    case "REFUNDED":
    case "RECEIVED_WITHOUT_INTEGRATION":
    case "DELETED":
      return "CANCELED";
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
      return "PENDING";
    default:
      return "PENDING";
  }
}

function getWebhookAuthToken(): string | null {
  return (
    process.env.CLUB_ASAAS_WEBHOOK_AUTH_TOKEN ||
    process.env.ASAAS_WEBHOOK_AUTH_TOKEN ||
    null
  );
}

function buildCheckoutCallbackUrls(returnUrl: string) {
  const base = new URL(returnUrl);

  const successUrl = new URL(base.toString());
  successUrl.searchParams.set("checkout", "success");

  const cancelUrl = new URL(base.toString());
  cancelUrl.searchParams.set("checkout", "canceled");

  const expiredUrl = new URL(base.toString());
  expiredUrl.searchParams.set("checkout", "expired");

  return {
    successUrl: successUrl.toString(),
    cancelUrl: cancelUrl.toString(),
    expiredUrl: expiredUrl.toString(),
  };
}

async function asaasRequest<T>(
  apiKey: string,
  environment: "SANDBOX" | "PRODUCTION",
  path: string,
  init: RequestInit
): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("access_token", apiKey);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${getAsaasApiBase(environment)}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  const parsed = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      (parsed &&
        typeof parsed === "object" &&
        parsed !== null &&
        "errors" in parsed &&
        Array.isArray(parsed.errors) &&
        parsed.errors.length > 0 &&
        typeof parsed.errors[0] === "object" &&
        parsed.errors[0] !== null &&
        "description" in parsed.errors[0] &&
        typeof parsed.errors[0].description === "string" &&
        parsed.errors[0].description) ||
      (parsed &&
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed &&
        typeof parsed.message === "string" &&
        parsed.message) ||
      `Asaas request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return parsed as T;
}

function normalizeSubscriptionResponse(
  response: AsaasSubscriptionResponse
): NormalizedClubSubscriptionState {
  const rawStatus = normalizeString(response.status);

  return {
    provider: "ASAAS",
    providerCustomerId: normalizeString(response.customer),
    providerSubscriptionId: normalizeString(response.id),
    providerPaymentId: null,
    providerCheckoutUrl: null,
    providerStatusRaw: rawStatus,
    providerReference: normalizeString(response.externalReference),
    status: mapAsaasSubscriptionStatus(rawStatus, Boolean(response.deleted)),
    currentPeriodStart: normalizeDate(response.dateCreated),
    currentPeriodEnd: normalizeDate(response.nextDueDate),
    canceledAt:
      rawStatus?.toUpperCase() === "INACTIVE" || response.deleted
        ? normalizeDate(response.dateCreated)
        : null,
    raw: response,
  };
}

function normalizePaymentWebhookState(
  payment: AsaasWebhookPayment,
  raw: unknown
): NormalizedClubSubscriptionState {
  const rawStatus = normalizeString(payment.status);

  return {
    provider: "ASAAS",
    providerCustomerId: normalizeString(payment.customer),
    providerSubscriptionId: normalizeString(payment.subscription),
    providerPaymentId: normalizeString(payment.id),
    providerCheckoutUrl:
      normalizeString(payment.invoiceUrl) || normalizeString(payment.bankSlipUrl),
    providerStatusRaw: rawStatus,
    providerReference: normalizeString(payment.externalReference),
    status: mapAsaasPaymentStatus(rawStatus),
    currentPeriodStart:
      normalizeDate(payment.confirmedDate) ||
      normalizeDate(payment.paymentDate) ||
      normalizeDate(payment.clientPaymentDate),
    currentPeriodEnd:
      normalizeDate(payment.originalDueDate) || normalizeDate(payment.dueDate),
    canceledAt:
      rawStatus?.toUpperCase() === "REFUNDED" || rawStatus?.toUpperCase() === "DELETED"
        ? new Date()
        : null,
    raw,
  };
}

function normalizeSubscriptionWebhookState(
  subscription: AsaasWebhookSubscription,
  raw: unknown
): NormalizedClubSubscriptionState {
  const rawStatus = normalizeString(subscription.status);

  return {
    provider: "ASAAS",
    providerCustomerId: normalizeString(subscription.customer),
    providerSubscriptionId: normalizeString(subscription.id),
    providerPaymentId: null,
    providerCheckoutUrl: null,
    providerStatusRaw: rawStatus,
    providerReference: normalizeString(subscription.externalReference),
    status: mapAsaasSubscriptionStatus(rawStatus, Boolean(subscription.deleted)),
    currentPeriodStart: normalizeDate(subscription.dateCreated),
    currentPeriodEnd: normalizeDate(subscription.nextDueDate),
    canceledAt:
      rawStatus?.toUpperCase() === "INACTIVE" || subscription.deleted
        ? new Date()
        : null,
    raw,
  };
}

function normalizeCheckoutWebhookEvent(checkout: AsaasWebhookCheckout): {
  providerReference: string | null;
  resourceId: string | null;
} {
  return {
    providerReference: normalizeString(checkout.externalReference),
    resourceId: normalizeString(checkout.id),
  };
}

export class AsaasClubBillingProvider implements ClubBillingProvider {
  async createSubscription(
    input: CreateClubSubscriptionInput
  ): Promise<CreateClubSubscriptionResult> {
    assertProviderConfig(input.providerConfig, "ASAAS");

    if (!input.returnUrl) {
      throw new Error("returnUrl é obrigatório para criar checkout recorrente no Asaas.");
    }

    const callback = buildCheckoutCallbackUrls(input.returnUrl);
    const amount = centsToAsaasAmount(input.priceInCents);

    const body = {
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: input.externalReference,
      callback,
      items: [
        {
          name: input.planName,
          description:
            input.description?.trim() ||
            `${input.planName} - ${input.providerConfig.tenantName}`,
          quantity: 1,
          value: amount,
        },
      ],
      customerData: {
        name: input.customer.name,
        email: input.customer.email?.trim() 
          ? input.customer.email.trim() 
          : `club-${input.providerConfig.tenantSlug}-${input.customer.phoneE164.replace(/\D/g, "")}@tratomarcado.local`,
        cpfCnpj: input.customer.cpfCnpj || undefined,
        mobilePhone: input.customer.phoneE164.replace(/\D/g, ""),
        phone: input.customer.phoneE164.replace(/\D/g, ""),
      },
      subscription: {
        cycle: mapClubCycleToAsaasCycle(input.billingCycle),
        nextDueDate: new Date().toISOString(),
      },
    };

    const response = await asaasRequest<AsaasCheckoutResponse>(
      input.providerConfig.apiKey,
      input.providerConfig.environment,
      "/checkouts",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return {
      provider: "ASAAS",
      providerCustomerId: normalizeString(response.customer),
      providerSubscriptionId: null,
      providerPaymentId: normalizeString(response.id),
      providerCheckoutUrl: normalizeString(response.link),
      providerStatusRaw: normalizeString(response.status),
      providerReference:
        normalizeString(response.externalReference) || input.externalReference,
      raw: response,
    };
  }

  async cancelSubscription(
    input: CancelClubSubscriptionInput
  ): Promise<CancelClubSubscriptionResult> {
    assertProviderConfig(input.providerConfig, "ASAAS");

    const response = await asaasRequest<AsaasSubscriptionResponse>(
      input.providerConfig.apiKey,
      input.providerConfig.environment,
      `/subscriptions/${input.providerSubscriptionId}`,
      {
        method: "DELETE",
      }
    );

    const rawStatus = normalizeString(response.status);

    return {
      provider: "ASAAS",
      canceled: true,
      providerStatusRaw: rawStatus || "INACTIVE",
      canceledAt: new Date(),
      raw: response,
    };
  }

  async getSubscription(
    input: GetClubSubscriptionInput
  ): Promise<NormalizedClubSubscriptionState> {
    assertProviderConfig(input.providerConfig, "ASAAS");

    const response = await asaasRequest<AsaasSubscriptionResponse>(
      input.providerConfig.apiKey,
      input.providerConfig.environment,
      `/subscriptions/${input.providerSubscriptionId}`,
      {
        method: "GET",
      }
    );

    return normalizeSubscriptionResponse(response);
  }

  async verifyAndParseWebhook(
    input: ClubBillingWebhookInput
  ): Promise<ClubBillingWebhookResolution> {
    const authHeader = getHeaderValue(input.headers, "asaas-access-token");
    const expectedToken = getWebhookAuthToken();

    if (expectedToken && authHeader !== expectedToken) {
      throw new Error("Token do webhook do Asaas inválido.");
    }

    const body = safeJsonParse(input.body) as AsaasWebhookBody;
    const externalEventId = normalizeString(body.id);
    const eventName = normalizeString(body.event);

    if (!eventName) {
      throw new Error("Webhook do Asaas sem campo event.");
    }

    if (body.subscription) {
      const state = normalizeSubscriptionWebhookState(body.subscription, body);

      const event: ClubBillingWebhookEvent = {
        provider: "ASAAS",
        externalEventId,
        topic: "SUBSCRIPTION",
        action: eventName,
        resourceId: state.providerSubscriptionId,
        providerReference: state.providerReference,
        raw: body,
      };

      return { event, state };
    }

    if (body.payment) {
      const state = normalizePaymentWebhookState(body.payment, body);

      const event: ClubBillingWebhookEvent = {
        provider: "ASAAS",
        externalEventId,
        topic: "PAYMENT",
        action: eventName,
        resourceId: state.providerPaymentId,
        providerReference: state.providerReference,
        raw: body,
      };

      return { event, state };
    }

    if (body.checkout) {
      const checkoutInfo = normalizeCheckoutWebhookEvent(body.checkout);

      const event: ClubBillingWebhookEvent = {
        provider: "ASAAS",
        externalEventId,
        topic: "CHECKOUT",
        action: eventName,
        resourceId: checkoutInfo.resourceId,
        providerReference: checkoutInfo.providerReference,
        raw: body,
      };

      return {
        event,
        state: null,
      };
    }

    return {
      event: {
        provider: "ASAAS",
        externalEventId,
        topic: "UNKNOWN",
        action: eventName,
        resourceId: null,
        providerReference: null,
        raw: body,
      },
      state: null,
    };
  }
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

export const asaasClubBillingProvider = new AsaasClubBillingProvider();
