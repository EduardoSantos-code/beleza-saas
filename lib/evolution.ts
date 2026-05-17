// lib/evolution.ts

const WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "SEND_MESSAGE",
] as const;

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getEvolutionBaseUrl() {
  const value =
    process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_URL;

  if (!value) {
    throw new Error(
      "EVOLUTION_API_URL/NEXT_PUBLIC_EVOLUTION_URL não configurado"
    );
  }

  return normalizeBaseUrl(value);
}

export function getEvolutionApiKey() {
  const value = process.env.EVOLUTION_API_KEY;

  if (!value) {
    throw new Error("EVOLUTION_API_KEY não configurado");
  }

  return value;
}

export function getAppBaseUrl() {
  const direct =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (direct) return normalizeBaseUrl(direct);

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

export function buildTenantInstanceName(slug: string, tenantId: string) {
  const cleanSlug =
    slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "tenant";

  const cleanId = tenantId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase();

  return `tenant-${cleanSlug}-${cleanId}`;
}

type EvolutionRequestInit = RequestInit & {
  json?: unknown;
};

export async function evolutionRequest(
  path: string,
  init: EvolutionRequestInit = {}
) {
  const url = `${getEvolutionBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("apikey", getEvolutionApiKey());

  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  const rawText = await response.text();
  let data: any = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!response.ok) {
    const error = new Error(
      `Evolution ${response.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`
    ) as Error & { status?: number; data?: unknown };

    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function errorText(error: any) {
  try {
    return JSON.stringify(error?.data || error?.message || "").toLowerCase();
  } catch {
    return String(error?.message || "").toLowerCase();
  }
}

function isDuplicateInstanceError(error: any) {
  const text = errorText(error);

  return (
    error?.status === 403 ||
    error?.status === 409 ||
    text.includes("already") ||
    text.includes("exists") ||
    text.includes("instance already") ||
    text.includes("instance exists")
  );
}

function looksLikeCreateSchemaMismatch(error: any) {
  const text = errorText(error);

  return (
    error?.status === 400 &&
    (
      text.includes('requires property "webhook"') ||
      text.includes("instance requires property") ||
      text.includes("webhook_by_events") ||
      text.includes('"webhook":') ||
      text.includes("must be string") ||
      text.includes("must be object")
    )
  );
}

function looksLikeSetWebhookSchemaMismatch(error: any) {
  const text = errorText(error);

  return (
    error?.status === 400 &&
    (
      text.includes("webhookbyevents") ||
      text.includes("webhookbase64") ||
      text.includes("webhook_by_events") ||
      text.includes("webhook_base64") ||
      text.includes('requires property "enabled"')
    )
  );
}

export async function ensureInstanceCreated(
  instanceName: string,
  webhookUrl?: string
) {
  const webhook = webhookUrl || "";

  // Primeiro tenta formato v2
  try {
    return await evolutionRequest("/instance/create", {
      method: "POST",
      json: {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: false,
        rejectCall: true,
        msgCall: "No momento não atendemos ligações por aqui.",
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: true,
        syncFullHistory: false,
        webhook: {
          url: webhook,
          byEvents: false,
          base64: true,
          events: [...WEBHOOK_EVENTS],
        },
      },
    });
  } catch (error: any) {
    if (isDuplicateInstanceError(error)) {
      return null;
    }

    if (!looksLikeCreateSchemaMismatch(error)) {
      throw error;
    }
  }

  // Fallback para formato v1
  try {
    return await evolutionRequest("/instance/create", {
      method: "POST",
      json: {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: false,
        webhook,
        webhook_by_events: false,
        webhook_base64: true,
        events: [...WEBHOOK_EVENTS],
        reject_call: true,
        msg_call: "No momento não atendemos ligações por aqui.",
        groups_ignore: true,
        always_online: true,
        read_messages: true,
        read_status: true,
      },
    });
  } catch (error: any) {
    if (isDuplicateInstanceError(error)) {
      return null;
    }

    throw error;
  }
}

export async function setInstanceWebhook(
  instanceName: string,
  webhookUrl: string
) {
  // Primeiro tenta formato v2
  try {
    return await evolutionRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      json: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        events: [...WEBHOOK_EVENTS],
      },
    });
  } catch (error: any) {
    if (!looksLikeSetWebhookSchemaMismatch(error)) {
      throw error;
    }
  }

  // Fallback para formato v1
  return evolutionRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    json: {
      url: webhookUrl,
      events: [...WEBHOOK_EVENTS],
      webhook_by_events: false,
      webhook_base64: true,
    },
  });
}

export async function connectInstance(instanceName: string) {
  return evolutionRequest(
    `/instance/connect/${encodeURIComponent(instanceName)}`,
    {
      method: "GET",
    }
  );
}

export async function getConnectionState(instanceName: string) {
  return evolutionRequest(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    {
      method: "GET",
    }
  );
}

export function resolveConnectionStatus(payload: any):
  | "OPEN"
  | "CONNECTING"
  | "DISCONNECTED"
  | "UNKNOWN" {
  const raw = String(
    payload?.instance?.state ??
      payload?.state ??
      payload?.instance?.status ??
      payload?.status ??
      payload?.data?.state ??
      payload?.data?.status ??
      ""
  ).toLowerCase();

  if (!raw) return "UNKNOWN";

  if (["open", "connected", "online"].includes(raw)) {
    return "OPEN";
  }

  if (["connecting", "pairing", "qrcode", "qr", "starting"].includes(raw)) {
    return "CONNECTING";
  }

  if (["close", "closed", "disconnected", "offline", "logout"].includes(raw)) {
    return "DISCONNECTED";
  }

  return "UNKNOWN";
}

export function extractQrCodeBase64(payload: any) {
  const candidates = [
    payload?.base64,
    payload?.qrcode,
    payload?.qr,
    payload?.data?.base64,
    payload?.data?.qrcode,
    payload?.data?.qr,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function extractQrCodeText(payload: any) {
  const candidates = [
    payload?.code,
    payload?.qrCode,
    payload?.data?.code,
    payload?.data?.qrCode,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function extractPairingCode(payload: any) {
  const candidates = [
    payload?.pairingCode,
    payload?.pairing_code,
    payload?.data?.pairingCode,
    payload?.data?.pairing_code,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
