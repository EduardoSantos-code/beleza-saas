export type ClubAsaasEnvironment = "SANDBOX" | "PRODUCTION";

interface AsaasCustomerResponse {
  id: string;
  [key: string]: unknown;
}

interface AsaasSubscriptionResponse {
  id: string;
  [key: string]: unknown;
}

interface AsaasPayment {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  status?: string;
}

interface AsaasPaymentListResponse {
  data?: AsaasPayment[];
}

interface AsaasErrorResponse {
  errors?: Array<{ code: string; description: string }>;
  [key: string]: unknown;
}

function getAsaasBaseUrl(environment: ClubAsaasEnvironment): string {
  return environment === "PRODUCTION"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

function getTodayInSaoPauloDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

async function asaasRequest<T>(
  apiKey: string,
  environment: ClubAsaasEnvironment,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = getAsaasBaseUrl(environment);
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Asaas ${response.status}`;
    try {
      const errorData = (await response.json()) as AsaasErrorResponse;
      const description = errorData.errors?.[0]?.description;
      if (description) {
        errorMessage = `Asaas ${response.status}: ${description}`;
      }
    } catch {
      // Fallback para o status code se o JSON falhar
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export async function createAsaasCustomer(params: {
  apiKey: string;
  environment: ClubAsaasEnvironment;
  name: string;
  cpfCnpj: string;
  phoneE164: string;
  externalReference: string;
}): Promise<AsaasCustomerResponse> {
  const cleanCpfCnpj = params.cpfCnpj.replace(/\D/g, "");
  const mobilePhone = params.phoneE164.replace("+55", "").replace(/\D/g, "");

  return asaasRequest<AsaasCustomerResponse>(
    params.apiKey,
    params.environment,
    "POST",
    "/customers",
    {
      name: params.name,
      cpfCnpj: cleanCpfCnpj,
      mobilePhone,
      externalReference: `club_subscription:${params.externalReference}`,
      notificationDisabled: false,
    }
  );
}

export async function createAsaasSubscription(params: {
  apiKey: string;
  environment: ClubAsaasEnvironment;
  customerId: string;
  valueInCents: number;
  cycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
  description: string;
  externalReference: string;
}): Promise<AsaasSubscriptionResponse> {
  const cycleMapping = {
    MONTHLY: "MONTHLY",
    QUARTERLY: "QUARTERLY",
    SEMIANNUAL: "SEMIANNUALLY",
    YEARLY: "YEARLY",
  };

  const body = {
    customer: params.customerId,
    billingType: "UNDEFINED",
    nextDueDate: getTodayInSaoPauloDate(),
    value: params.valueInCents / 100,
    cycle: cycleMapping[params.cycle],
    description: params.description,
    externalReference: params.externalReference,
  };

  return asaasRequest<AsaasSubscriptionResponse>(
    params.apiKey,
    params.environment,
    "POST",
    "/subscriptions",
    body
  );
}

export async function listAsaasSubscriptionPayments(params: {
  apiKey: string;
  environment: ClubAsaasEnvironment;
  subscriptionId: string;
}): Promise<AsaasPaymentListResponse> {
  return asaasRequest<AsaasPaymentListResponse>(
    params.apiKey,
    params.environment,
    "GET",
    `/subscriptions/${params.subscriptionId}/payments`
  );
}

export { getAsaasBaseUrl, getTodayInSaoPauloDate };