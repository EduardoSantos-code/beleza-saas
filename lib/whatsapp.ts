import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { evolutionRequest } from "@/lib/evolution";
import { getRedis } from "@/lib/redis";

const FALLBACK_INSTANCE = process.env.EVOLUTION_INSTANCE || "";
const ALLOW_GLOBAL_FALLBACK =
  process.env.ALLOW_WHATSAPP_GLOBAL_FALLBACK === "true";

const SCHEDULE_DELAY_MIN_MS = parsePositiveInt(
  process.env.WHATSAPP_DELAY_MIN_MS,
  4000
);

const SCHEDULE_DELAY_MAX_MS = parsePositiveInt(
  process.env.WHATSAPP_DELAY_MAX_MS,
  12000
);

const QUEUE_GAP_MIN_MS = parsePositiveInt(
  process.env.WHATSAPP_QUEUE_GAP_MIN_MS,
  1200
);

const QUEUE_GAP_MAX_MS = parsePositiveInt(
  process.env.WHATSAPP_QUEUE_GAP_MAX_MS,
  3000
);

const REDIS_LOCK_TTL_MS = parsePositiveInt(
  process.env.WHATSAPP_REDIS_LOCK_TTL_MS,
  15000
);

const REDIS_LOCK_WAIT_TIMEOUT_MS = parsePositiveInt(
  process.env.WHATSAPP_REDIS_LOCK_WAIT_TIMEOUT_MS,
  12000
);

const REDIS_LOCK_RETRY_MIN_MS = parsePositiveInt(
  process.env.WHATSAPP_REDIS_LOCK_RETRY_MIN_MS,
  150
);

const REDIS_LOCK_RETRY_MAX_MS = parsePositiveInt(
  process.env.WHATSAPP_REDIS_LOCK_RETRY_MAX_MS,
  400
);

const LAST_SEND_TTL_MS = parsePositiveInt(
  process.env.WHATSAPP_LAST_SEND_TTL_MS,
  7 * 24 * 60 * 60 * 1000
);

const LINK_PREVIEW_ENABLED = process.env.WHATSAPP_LINK_PREVIEW === "true";
const MIN_EVOLUTION_DELAY_MS = 1000;

type SendTenantWhatsAppMessageInput = {
  tenantId?: string;
  instanceName?: string;
  clientId?: string | null;
  to: string;
  text: string;
  replyToMessageId?: string;
};

type SendResult = {
  success: boolean;
  reason?: string;
  status?: number;
  data: any;
  messages: Array<{ id: string }>;
};

type DispatchReservation = {
  delayMs: number;
  plannedSendAt: number;
  mode: "redis" | "memory";
};

const localReservationQueueMap = new Map<string, Promise<void>>();
const localLastReservedAtMap = new Map<string, number>();

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getRange(min: number, max: number) {
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

function randomBetween(min: number, max: number) {
  const range = getRange(min, max);
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhoneNumber(input: string) {
  const digits = input.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("55")) return digits;

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function buildFailure(
  reason: string,
  status?: number,
  data?: any
): SendResult {
  return {
    success: false,
    reason,
    status,
    data: data ?? null,
    messages: [],
  };
}

function classifyFailure(status?: number) {
  if (!status) return "TEMPORARY_FAILURE";

  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return "TEMPORARY_FAILURE";
  }

  if (status === 404) return "INSTANCE_NOT_FOUND";

  return "SEND_FAILED";
}

function calculateDispatchReservation(lastReservedAt?: number | null) {
  const now = Date.now();
  const baseDelayMs = randomBetween(
    SCHEDULE_DELAY_MIN_MS,
    SCHEDULE_DELAY_MAX_MS
  );
  const gapMs = randomBetween(QUEUE_GAP_MIN_MS, QUEUE_GAP_MAX_MS);

  const earliestByOwnDelay = now + baseDelayMs;
  const earliestByQueue =
    lastReservedAt && lastReservedAt > 0
      ? lastReservedAt + gapMs
      : earliestByOwnDelay;

  const plannedSendAt = Math.max(earliestByOwnDelay, earliestByQueue);
  const delayMs = Math.max(plannedSendAt - now, MIN_EVOLUTION_DELAY_MS);

  return {
    delayMs,
    plannedSendAt,
  };
}

async function reserveDispatchSlotInMemory(
  instanceName: string
): Promise<DispatchReservation> {
  const previous = localReservationQueueMap.get(instanceName) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  localReservationQueueMap.set(
    instanceName,
    previous.catch(() => undefined).then(() => gate)
  );

  await previous.catch(() => undefined);

  try {
    const lastReservedAt = localLastReservedAtMap.get(instanceName) ?? 0;
    const reservation = calculateDispatchReservation(lastReservedAt);

    localLastReservedAtMap.set(instanceName, reservation.plannedSendAt);

    return {
      ...reservation,
      mode: "memory",
    };
  } finally {
    release();

    const current = localReservationQueueMap.get(instanceName);
    if (current === gate) {
      localReservationQueueMap.delete(instanceName);
    }
  }
}

async function acquireRedisLock(lockKey: string) {
  const redis = getRedis();
  if (!redis) return null;

  const token = randomUUID();
  const startedAt = Date.now();

  while (Date.now() - startedAt < REDIS_LOCK_WAIT_TIMEOUT_MS) {
    const result = await redis.set(
      lockKey,
      token,
      "PX",
      REDIS_LOCK_TTL_MS,
      "NX"
    );

    if (result === "OK") {
      return token;
    }

    await sleep(
      randomBetween(REDIS_LOCK_RETRY_MIN_MS, REDIS_LOCK_RETRY_MAX_MS)
    );
  }

  return null;
}

async function releaseRedisLock(lockKey: string, token: string) {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.eval(
      `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
      `,
      1,
      lockKey,
      token
    );
  } catch (error) {
    console.error("[WHATSAPP_REDIS_UNLOCK_ERROR]", error);
  }
}

async function reserveDispatchSlotWithRedis(
  instanceName: string
): Promise<DispatchReservation | null> {
  const redis = getRedis();
  if (!redis) return null;

  const lockKey = `wa:lock:${instanceName}`;
  const lastSendKey = `wa:last-send:${instanceName}`;

  const lockToken = await acquireRedisLock(lockKey);

  if (!lockToken) {
    throw new Error("QUEUE_LOCK_TIMEOUT");
  }

  try {
    const rawLastReservedAt = await redis.get(lastSendKey);
    const lastReservedAt = Number(rawLastReservedAt || 0) || 0;

    const reservation = calculateDispatchReservation(lastReservedAt);

    await redis.set(
      lastSendKey,
      String(reservation.plannedSendAt),
      "PX",
      LAST_SEND_TTL_MS
    );

    return {
      ...reservation,
      mode: "redis",
    };
  } finally {
    await releaseRedisLock(lockKey, lockToken);
  }
}

async function reserveDispatchSlot(
  instanceName: string
): Promise<DispatchReservation> {
  try {
    const redisReservation = await reserveDispatchSlotWithRedis(instanceName);
    if (redisReservation) {
      return redisReservation;
    }
  } catch (error) {
    console.error("[WHATSAPP_REDIS_RESERVATION_ERROR]", error);
  }

  return reserveDispatchSlotInMemory(instanceName);
}

async function sendViaInstance(params: {
  instanceName: string;
  to: string;
  text: string;
  replyToMessageId?: string;
}): Promise<SendResult> {
  const number = normalizePhoneNumber(params.to);

  if (!number) {
    return buildFailure("INVALID_NUMBER", 400, {
      message: "Número inválido",
    });
  }

  let reservation: DispatchReservation;

  try {
    reservation = await reserveDispatchSlot(params.instanceName);
  } catch (error: any) {
    return buildFailure("TEMPORARY_FAILURE", 429, {
      message: "Instância ocupada no momento. Tente novamente.",
      error: error?.message ?? String(error),
    });
  }

  try {
    const data = await evolutionRequest(
      `/message/sendText/${encodeURIComponent(params.instanceName)}`,
      {
        method: "POST",
        json: {
          number,
          text: params.text,
          delay: reservation.delayMs,
          linkPreview: LINK_PREVIEW_ENABLED,
          ...(params.replyToMessageId
            ? {
                quoted: {
                  key: {
                    id: params.replyToMessageId,
                  },
                },
              }
            : {}),
        },
      }
    );

    const messageId = data?.key?.id || data?.id || null;

    return {
      success: true,
      data: {
        ...data,
        _dispatchControl: {
          mode: reservation.mode,
          delayMs: reservation.delayMs,
          plannedSendAt: reservation.plannedSendAt,
        },
      },
      messages: messageId ? [{ id: messageId }] : [],
    };
  } catch (error: any) {
    const status = Number(error?.status || 0) || undefined;
    const reason = classifyFailure(status);

    return buildFailure(reason, status, {
      error: error?.data ?? error?.message,
      dispatchControl: {
        mode: reservation.mode,
        delayMs: reservation.delayMs,
        plannedSendAt: reservation.plannedSendAt,
      },
    });
  }
}

async function resolveInstanceName(input: SendTenantWhatsAppMessageInput) {
  if (input.instanceName) {
    return {
      ok: true as const,
      instanceName: input.instanceName,
    };
  }

  if (input.tenantId) {
    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId: input.tenantId },
    });

    if (!config?.instanceName) {
      return {
        ok: false as const,
        failure: buildFailure("NOT_CONFIGURED", 400, {
          message: "WhatsApp não configurado para este tenant",
        }),
      };
    }

    return {
      ok: true as const,
      instanceName: config.instanceName,
    };
  }

  if (ALLOW_GLOBAL_FALLBACK && FALLBACK_INSTANCE) {
    return {
      ok: true as const,
      instanceName: FALLBACK_INSTANCE,
    };
  }

  return {
    ok: false as const,
    failure: buildFailure("TENANT_OR_INSTANCE_REQUIRED", 400, {
      message:
        "Envio sem tenantId/instanceName bloqueado. Atualize o chamador para usar a instância da barbearia.",
    }),
  };
}

export async function sendTenantWhatsAppMessage(
  input: SendTenantWhatsAppMessageInput
): Promise<SendResult> {
  const text = input.text || "";
  const isOtp =
    text.includes("código para acessar sua assinatura") ||
    text.includes("código para usar o benefício") ||
    text.includes("código para assinar o clube");

  const isReminder = text.includes("Passando pra lembrar que seu trato é");

  if (!isOtp && !isReminder) {
    console.log(`[WhatsApp] Envio bloqueado por filtro (Opção 3): "${text.substring(0, 60)}..."`);
    return {
      success: true,
      reason: "BLOCKED_BY_FILTER_OPTION_3",
      data: { status: "BLOCKED_BY_FILTER_OPTION_3" },
      messages: [],
    };
  }

  const resolved = await resolveInstanceName(input);

  if (!resolved.ok) {
    return resolved.failure;
  }

  const instanceName = resolved.instanceName;

  const result = await sendViaInstance({
    instanceName,
    to: input.to,
    text: input.text,
    replyToMessageId: input.replyToMessageId,
  });

  if (input.tenantId) {
    try {
      if (result.success) {
        await prisma.whatsappConfig.update({
          where: { tenantId: input.tenantId },
          data: {
            status: "OPEN",
            qrCodeBase64: null,
            qrCodeText: null,
            pairingCode: null,
            lastConnectionAt: new Date(),
          },
        });
      } else if (result.reason === "INSTANCE_NOT_FOUND") {
        await prisma.whatsappConfig.update({
          where: { tenantId: input.tenantId },
          data: {
            status: "DISCONNECTED",
          },
        });
      }
    } catch (logError) {
      console.error("[WHATSAPP_CONFIG_STATUS_UPDATE_ERROR]", logError);
    }
  }

  return result;
}

export async function sendWhatsAppMessage(
  firstArg:
    | string
    | {
        tenantId?: string;
        instanceName?: string;
        clientId?: string | null;
        to: string;
        text: string;
        replyToMessageId?: string;
      },
  secondArg?: string
) {
  if (typeof firstArg === "string") {
    return buildFailure("TENANT_OR_INSTANCE_REQUIRED", 400, {
      message:
        "Use sendTenantWhatsAppMessage({ tenantId, to, text }) em vez da assinatura antiga.",
      legacyTo: firstArg,
      legacyText: secondArg || "",
    });
  }

  return sendTenantWhatsAppMessage(firstArg);
}

export async function sendWhatsAppText(
  firstArg:
    | string
    | {
        tenantId?: string;
        instanceName?: string;
        clientId?: string | null;
        to: string;
        text: string;
        replyToMessageId?: string;
      },
  secondArg?: string
) {
  if (typeof firstArg === "string") {
    return buildFailure("TENANT_OR_INSTANCE_REQUIRED", 400, {
      message:
        "Use sendTenantWhatsAppMessage({ tenantId, to, text }) em vez da assinatura antiga.",
      legacyTo: firstArg,
      legacyText: secondArg || "",
    });
  }

  return sendTenantWhatsAppMessage(firstArg);
}

export async function sendZap(
  tenantIdOrTo: string,
  toOrText: string,
  maybeText?: string
) {
  if (typeof maybeText === "string") {
    return sendTenantWhatsAppMessage({
      tenantId: tenantIdOrTo,
      to: toOrText,
      text: maybeText,
    });
  }

  return buildFailure("TENANT_OR_INSTANCE_REQUIRED", 400, {
    message:
      "Use sendTenantWhatsAppMessage({ tenantId, to, text }) ou sendZap(tenantId, to, text).",
    legacyTo: tenantIdOrTo,
    legacyText: toOrText,
  });
}
