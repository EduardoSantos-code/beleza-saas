import type {
  ClubAsaasEnvironment,
  ClubMercadoPagoEnvironment,
  ClubPaymentProvider,
} from "@prisma/client";
import { asaasClubBillingProvider } from "./asaas";
import { mercadoPagoClubBillingProvider } from "./mercadopago";
import type {
  ClubBillingProvider,
  ClubBillingProviderConfig,
} from "./types";

type TenantBillingSource = {
  id: string;
  name: string;
  slug: string;
  clubPaymentProvider: ClubPaymentProvider | null;
  clubAsaasEnvironment?: ClubAsaasEnvironment | null;
  clubMercadoPagoEnvironment?: ClubMercadoPagoEnvironment | null;
};

type TenantBillingSecrets = {
  asaasApiKey?: string | null;
  mercadoPagoAccessToken?: string | null;
  mercadoPagoPublicKey?: string | null;
};

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getClubBillingProvider(
  provider: ClubPaymentProvider
): ClubBillingProvider {
  switch (provider) {
    case "ASAAS":
      return asaasClubBillingProvider;
    case "MERCADO_PAGO":
      return mercadoPagoClubBillingProvider;
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Provider de billing não suportado: ${exhaustiveCheck}`);
    }
  }
}

export function requireClubPaymentProvider(
  provider: ClubPaymentProvider | null | undefined
): ClubPaymentProvider {
  if (!provider) {
    throw new Error("Nenhum provider de pagamento do clube foi configurado.");
  }

  return provider;
}

export function buildClubBillingConfigFromTenant(
  tenant: TenantBillingSource,
  secrets: TenantBillingSecrets
): ClubBillingProviderConfig {
  const provider = requireClubPaymentProvider(tenant.clubPaymentProvider);

  if (provider === "ASAAS") {
    const apiKey = nonEmpty(secrets.asaasApiKey);

    if (!apiKey) {
      throw new Error(
        `A chave da API do Asaas não está configurada para o tenant ${tenant.slug}.`
      );
    }

    return {
      provider: "ASAAS",
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      environment: tenant.clubAsaasEnvironment ?? "SANDBOX",
      apiKey,
    };
  }

  const accessToken = nonEmpty(secrets.mercadoPagoAccessToken);

  if (!accessToken) {
    throw new Error(
      `O access token do Mercado Pago não está configurado para o tenant ${tenant.slug}.`
    );
  }

  return {
    provider: "MERCADO_PAGO",
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    environment: tenant.clubMercadoPagoEnvironment ?? "SANDBOX",
    accessToken,
    publicKey: nonEmpty(secrets.mercadoPagoPublicKey),
  };
}

export function getClubBillingProviderFromTenant(
  tenant: TenantBillingSource,
  secrets: TenantBillingSecrets
): {
  provider: ClubPaymentProvider;
  config: ClubBillingProviderConfig;
  adapter: ClubBillingProvider;
} {
  const config = buildClubBillingConfigFromTenant(tenant, secrets);

  return {
    provider: config.provider,
    config,
    adapter: getClubBillingProvider(config.provider),
  };
}
