import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { logWhatsAppOutboundMessage } from "@/lib/whatsapp-log";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: {
          phone_number_id?: string;
          display_phone_number?: string;
        };
        contacts?: Array<{
          wa_id?: string;
          profile?: {
            name?: string;
          };
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          recipient_id?: string;
        }>;
      };
    }>;
  }>;
};

function normalizePhoneToE164(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

function mapMessageType(type?: string) {
  switch (type) {
    case "text":
      return "TEXT";
    case "image":
      return "IMAGE";
    case "audio":
      return "AUDIO";
    case "video":
      return "VIDEO";
    case "document":
      return "DOCUMENT";
    case "sticker":
      return "STICKER";
    case "location":
      return "LOCATION";
    case "contacts":
      return "CONTACTS";
    case "interactive":
      return "INTERACTIVE";
    case "button":
      return "BUTTON";
    case "order":
      return "ORDER";
    case "reaction":
      return "REACTION";
    default:
      return "UNKNOWN";
  }
}

function verifySignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    throw new Error("WHATSAPP_APP_SECRET não definida");
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const received = signatureHeader.replace("sha256=", "");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json(
      { error: "WHATSAPP_VERIFY_TOKEN não definida" },
      { status: 500 }
    );
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return NextResponse.json({ error: "Token inválido" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const rawBody = await req.text();

    const validSignature = verifySignature(rawBody, signature);

    if (!validSignature) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as WhatsAppWebhookPayload;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages" || !change.value) continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        if (!phoneNumberId) continue;

        const tenant = await prisma.tenant.findFirst({
          where: {
            whatsappConfig: {
              phoneNumberId,
            },
          },
          include: {
            whatsappConfig: true,
          },
        });

        if (!tenant || !tenant.whatsappConfig) {
          console.warn("Webhook recebido para phoneNumberId sem tenant:", phoneNumberId);
          continue;
        }

        const contactNameMap = new Map<string, string | undefined>();
        for (const contact of value.contacts ?? []) {
          if (contact.wa_id) {
            contactNameMap.set(contact.wa_id, contact.profile?.name);
          }
        }

        for (const message of value.messages ?? []) {
          if (!message.id || !message.from) continue;

          const existing = await prisma.whatsAppInboundMessage.findUnique({
            where: { waMessageId: message.id },
            select: { id: true },
          });

          if (existing) {
            continue;
          }

          const fromPhoneE164 = normalizePhoneToE164(message.from);
          if (!fromPhoneE164) continue;

          const fromName = contactNameMap.get(message.from) || null;

          const client = await prisma.client.upsert({
            where: {
              tenantId_phoneE164: {
                tenantId: tenant.id,
                phoneE164: fromPhoneE164,
              },
            },
            create: {
              tenantId: tenant.id,
              phoneE164: fromPhoneE164,
              name: fromName || fromPhoneE164,
            },
            update: {
              name: fromName || undefined,
            },
          });

          await prisma.whatsAppInboundMessage.create({
            data: {
              tenantId: tenant.id,
              clientId: client.id,
              waMessageId: message.id,
              phoneNumberId,
              fromPhoneE164,
              fromName,
              type: mapMessageType(message.type) as any,
              textBody: message.text?.body || null,
              rawJson: message as any,
            },
          });

          // Auto reply básico apenas para texto
          if (message.type === "text") {
            const incomingText = (message.text?.body || "").trim().toLowerCase();

            let reply =
              `Olá, ${client.name}! Recebemos sua mensagem no ${tenant.name}.\n\n` +
              `Em breve alguém do salão responde por aqui.`;

            if (
              incomingText.includes("oi") ||
              incomingText.includes("olá") ||
              incomingText.includes("ola")
            ) {
              reply =
                `Olá, ${client.name}! 👋\n\n` +
                `Recebemos sua mensagem no ${tenant.name}.\n` +
                `Se quiser, você pode agendar direto pela nossa página online ou aguardar que respondemos por aqui.`;
            }

            try {
              const waResponse = await sendWhatsAppText({
                phoneNumberId: tenant.whatsappConfig.phoneNumberId,
                accessToken: tenant.whatsappConfig.accessToken,
                to: fromPhoneE164,
                text: reply,
                replyToMessageId: message.id,
              });

              await logWhatsAppOutboundMessage({
                tenantId: tenant.id,
                clientId: client.id,
                phoneNumberId: tenant.whatsappConfig.phoneNumberId,
                toPhoneE164: fromPhoneE164,
                textBody: reply,
                waMessageId: waResponse?.messages?.[0]?.id ?? null,
                rawJson: waResponse,
              });
            } catch (replyError) {
              console.error("Erro ao enviar auto-reply:", replyError);
            }
          }
        }

        // Statuses: por enquanto só loga
        for (const status of value.statuses ?? []) {
          console.log("Status webhook:", {
            tenantId: tenant.id,
            waMessageId: status.id,
            status: status.status,
            recipientId: status.recipient_id,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook WhatsApp:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}