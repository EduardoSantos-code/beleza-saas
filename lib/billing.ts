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

export type BillingTenant = {
  planStatus: string | null;
  trialEndsAt: Date | null;
};

export function isTenantBillingActive(tenant: BillingTenant): boolean {
  // Se for TRIAL, verifica se ainda não expirou
  if (tenant.planStatus === "TRIAL") {
    return tenant.trialEndsAt ? new Date() < new Date(tenant.trialEndsAt) : false;
  }

  // Se for ACTIVE, está liberado
  if (tenant.planStatus === "ACTIVE") {
    return true;
  }

  // Qualquer outro status (OVERDUE, EXPIRED, null) bloqueia o acesso
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