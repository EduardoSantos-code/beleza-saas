export type TenantSubscriptionStatus =
  | "NONE"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "UNPAID"
  | "PAUSED";

type BillingTenant = {
  subscriptionStatus: TenantSubscriptionStatus | string;
  trialEndsAt: Date | string | null;
  subscriptionCurrentPeriodEnd?: Date | string | null;
};

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function isTenantBillingActive(tenant: BillingTenant) {
  const now = new Date();

  if (tenant.subscriptionStatus === "ACTIVE") {
    return true;
  }

  if (tenant.subscriptionStatus === "TRIALING") {
    const trialEndsAt = toDate(tenant.trialEndsAt);

    if (!trialEndsAt) return true;
    return trialEndsAt > now;
  }

  return false;
}

export function billingStatusLabel(status: TenantSubscriptionStatus | string) {
  switch (status) {
    case "NONE":
      return "Sem assinatura";
    case "TRIALING":
      return "Em teste";
    case "ACTIVE":
      return "Ativa";
    case "PAST_DUE":
      return "Pagamento atrasado";
    case "CANCELED":
      return "Cancelada";
    case "INCOMPLETE":
      return "Incompleta";
    case "INCOMPLETE_EXPIRED":
      return "Expirada";
    case "UNPAID":
      return "Não paga";
    case "PAUSED":
      return "Pausada";
    default:
      return status;
  }
}