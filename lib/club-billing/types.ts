import type {
  ClubAsaasEnvironment,
  ClubBillingCycle,
  ClubMercadoPagoEnvironment,
  ClubPaymentProvider,
  ClubSubscriptionStatus,
} from "@prisma/client";

export type BillingEnvironment = "SANDBOX" | "PRODUCTION";

export type ClubBillingCustomerInput = {
  clientId: string;
  name: string;
  phoneE164: string;
  email?: string | null;
  cpfCnpj?: string | null;
};

export type ClubBillingTenantBase = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

export type ClubBillingAsaasConfig = ClubBillingTenantBase & {
  provider: "ASAAS";
  environment: ClubAsaasEnvironment;
  apiKey: string;
};

export type ClubBillingMercadoPagoConfig = ClubBillingTenantBase & {
  provider: "MERCADO_PAGO";
  environment: ClubMercadoPagoEnvironment;
  accessToken: string;
  publicKey?: string | null;
};

export type ClubBillingProviderConfig =
  | ClubBillingAsaasConfig
  | ClubBillingMercadoPagoConfig;

export type ClubBillingMetadata = Record<string, string | number | boolean | null>;

export type CreateClubSubscriptionInput = {
  providerConfig: ClubBillingProviderConfig;
  planId: string;
  planName: string;
  priceInCents: number;
  billingCycle: ClubBillingCycle;
  customer: ClubBillingCustomerInput;
  externalReference: string;
  returnUrl?: string | null;
  notificationUrl?: string | null;
  description?: string | null;
  metadata?: ClubBillingMetadata;
};

export type CreateClubSubscriptionResult = {
  provider: ClubPaymentProvider;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPaymentId?: string | null;
  providerCheckoutUrl?: string | null;
  providerStatusRaw?: string | null;
  providerReference?: string | null;
  raw: unknown;
};

export type CancelClubSubscriptionInput = {
  providerConfig: ClubBillingProviderConfig;
  providerSubscriptionId: string;
  reason?: string | null;
};

export type CancelClubSubscriptionResult = {
  provider: ClubPaymentProvider;
  canceled: boolean;
  providerStatusRaw?: string | null;
  canceledAt?: Date | null;
  raw: unknown;
};

export type GetClubSubscriptionInput = {
  providerConfig: ClubBillingProviderConfig;
  providerSubscriptionId: string;
};

export type NormalizedClubSubscriptionState = {
  provider: ClubPaymentProvider;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPaymentId?: string | null;
  providerCheckoutUrl?: string | null;
  providerStatusRaw?: string | null;
  providerReference?: string | null;
  status: ClubSubscriptionStatus;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  canceledAt?: Date | null;
  raw: unknown;
};

export type ClubBillingWebhookInput = {
  headers: Record<string, string | string[] | undefined>;
  body: string;
  query?: Record<string, string | string[] | undefined>;
};

export type ClubBillingWebhookEvent = {
  provider: ClubPaymentProvider;
  externalEventId?: string | null;
  topic?: string | null;
  action?: string | null;
  resourceId?: string | null;
  providerReference?: string | null;
  raw: unknown;
};

export type ClubBillingWebhookResolution = {
  event: ClubBillingWebhookEvent;
  state?: NormalizedClubSubscriptionState | null;
};

export interface ClubBillingProvider {
  createSubscription(
    input: CreateClubSubscriptionInput
  ): Promise<CreateClubSubscriptionResult>;

  cancelSubscription(
    input: CancelClubSubscriptionInput
  ): Promise<CancelClubSubscriptionResult>;

  getSubscription(
    input: GetClubSubscriptionInput
  ): Promise<NormalizedClubSubscriptionState>;

  verifyAndParseWebhook(
    input: ClubBillingWebhookInput
  ): Promise<ClubBillingWebhookResolution>;
}

export function assertProviderConfig<P extends ClubPaymentProvider>(
  config: ClubBillingProviderConfig,
  provider: P
): asserts config is Extract<ClubBillingProviderConfig, { provider: P }> {
  if (config.provider !== provider) {
    throw new Error(`Configuração inválida para provider ${provider}.`);
  }
}

export function clubBillingCycleToMonths(cycle: ClubBillingCycle): number {
  switch (cycle) {
    case "MONTHLY":
      return 1;
    case "QUARTERLY":
      return 3;
    case "SEMIANNUAL":
      return 6;
    case "YEARLY":
      return 12;
    default: {
      const exhaustiveCheck: never = cycle;
      throw new Error(`Ciclo não suportado: ${exhaustiveCheck}`);
    }
  }
}

export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}
