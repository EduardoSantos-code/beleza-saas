import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import {
  extractPairingCode,
  extractQrCodeBase64,
  extractQrCodeText,
  resolveConnectionStatus,
} from "@/lib/evolution";

function normalizePhoneFromJid(jid?: string | null) {
  if (!jid) return null;

  const digits = jid.split("@")[0]?.replace(/\D/g, "");
  if (!digits) return null;

  return `+${digits}`;
}

function normalizePhone(value?: string | null) {
  if (!value) return null;

  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;

  return `+${digits}`;
}

function normalizeEventName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[.\-\s]+/g, "_")
    .toUpperCase();
}

function extractMessageText(message: any): string | null {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.documentMessage?.caption ||
    null
  );
}

function detectMessageType(
  message: any
):
  | "TEXT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENT"
  | "STICKER"
  | "LOCATION"
  | "CONTACTS"
  | "UNKNOWN" {
  if (!message) return "UNKNOWN";
  if (message.conversation || message.extendedTextMessage) return "TEXT";
  if (message.imageMessage) return "IMAGE";
  if (message.audioMessage) return "AUDIO";
  if (message.videoMessage) return "VIDEO";
  if (message.documentMessage) return "DOCUMENT";
  if (message.stickerMessage) return "STICKER";
  if (message.locationMessage) return "LOCATION";
  if (message.contactMessage || message.contactsArrayMessage) return "CONTACTS";
  return "UNKNOWN";
}

function collectMessages(body: any): any[] {
  if (Array.isArray(body?.data?.messages)) return body.data.messages;
  if (Array.isArray(body?.messages)) return body.messages;
  if (Array.isArray(body?.data)) return body.data;
  if (body?.data?.key || body?.key) return [body?.data || body];
  return [];
}

function extractInstanceName(body: any) {
  return String(
    body?.instance ??
      body?.instanceName ??
      body?.data?.instance ??
      body?.data?.instanceName ??
      ""
  ).trim();
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "EVOLUTION" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ ok: true, ignored: "empty-body" });
    }

    const instanceName = extractInstanceName(body);
    const event = normalizeEventName(body?.event);

    console.log(
      "[WA_WEBHOOK_EVENT]",
      JSON.stringify({
        event,
        instanceName,
      })
    );

    if (!instanceName) {
      return NextResponse.json({ ok: true, ignored: "missing-instance" });
    }

    const config = await prisma.whatsappConfig.findUnique({
      where: { instanceName },
    });

    if (!config) {
      return NextResponse.json({ ok: true, ignored: "instance-not-found" });
    }

    if (event === "QRCODE_UPDATED") {
      await prisma.whatsappConfig.update({
        where: { id: config.id },
        data: {
          status: "CONNECTING",
          qrCodeBase64: extractQrCodeBase64(body),
          qrCodeText: extractQrCodeText(body),
          pairingCode: extractPairingCode(body),
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (
      event === "CONNECTION_UPDATE" ||
      body?.state ||
      body?.data?.state
    ) {
      const status = resolveConnectionStatus(body);

      const connectedPhone =
        normalizePhone(body?.data?.owner) ||
        normalizePhone(body?.owner) ||
        config.connectedPhone ||
        null;

      const profileName =
        body?.data?.profileName ||
        body?.profileName ||
        config.profileName ||
        null;

      await prisma.whatsappConfig.update({
        where: { id: config.id },
        data: {
          status,
          connectedPhone,
          profileName,
          ...(status === "OPEN"
            ? {
                lastConnectionAt: new Date(),
                qrCodeBase64: null,
                qrCodeText: null,
                pairingCode: null,
              }
            : {}),
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (event === "MESSAGES_UPSERT") {
      const messages = collectMessages(body);

      for (const item of messages) {
        const key = item?.key || {};

        if (key?.fromMe) continue;

        const waMessageId = key?.id || item?.id;
        const phoneE164 = normalizePhoneFromJid(
          key?.remoteJid || item?.remoteJid
        );

        if (!waMessageId || !phoneE164) continue;

        const fromName =
          item?.pushName ||
          item?.participantPushName ||
          item?.senderName ||
          null;

        const message = item?.message || {};
        const textBody = extractMessageText(message);
        const type = detectMessageType(message);

        const client = await prisma.client.upsert({
          where: {
            tenantId_phoneE164: {
              tenantId: config.tenantId,
              phoneE164,
            },
          },
          update: {
            ...(fromName ? { name: fromName } : {}),
          },
          create: {
            tenantId: config.tenantId,
            phoneE164,
            name: fromName || phoneE164,
          },
        });

        await prisma.whatsAppInboundMessage.upsert({
          where: {
            waMessageId,
          },
          update: {
            tenantId: config.tenantId,
            clientId: client.id,
            phoneNumberId: instanceName,
            fromPhoneE164: phoneE164,
            fromName,
            type,
            textBody,
            rawJson: item,
          },
          create: {
            tenantId: config.tenantId,
            clientId: client.id,
            waMessageId,
            phoneNumberId: instanceName,
            fromPhoneE164: phoneE164,
            fromName,
            type,
            textBody,
            rawJson: item,
          },
        });

        const cleanText = textBody?.trim() || "";
        console.log("[WA_WEBHOOK_CONFIRMATION_TEST]", { 
          cleanText, 
          phoneE164, 
          clientId: client.id 
        });
        
        const startsWith1 = cleanText.startsWith("1");
        const startsWith2 = cleanText.startsWith("2");
        const startsWith3 = cleanText.startsWith("3");
        
        if (startsWith1 || startsWith2 || startsWith3) {
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
          const upcomingApp = await prisma.appointment.findFirst({
            where: {
              tenantId: config.tenantId,
              status: { in: ["PENDING", "CONFIRMED"] },
              startAt: { gte: twelveHoursAgo },
              client: {
                OR: [
                  { id: client.id },
                  { phoneE164: phoneE164 },
                  { phoneE164: { endsWith: phoneE164.slice(-8) } }
                ]
              }
            },
            orderBy: { startAt: "asc" },
            include: { tenant: true, professional: true, client: true }
          });

          console.log("[WA_WEBHOOK_CONFIRMATION_RESULT]", { 
            found: !!upcomingApp,
            appId: upcomingApp?.id,
            startAt: upcomingApp?.startAt,
            clientPhone: upcomingApp?.client?.phoneE164
          });

          if (upcomingApp) {
             if (startsWith1) {
                await prisma.appointment.update({
                  where: { id: upcomingApp.id },
                  data: { presenceConfirmed: true }
                });
                await sendTenantWhatsAppMessage({
                  tenantId: config.tenantId,
                  to: phoneE164,
                  text: "✅ Presença confirmada! Te esperamos no horário marcado. 👊"
                });
             } else if (startsWith2 || startsWith3) {
                await prisma.appointment.update({
                  where: { id: upcomingApp.id },
                  data: { status: "CANCELED" }
                });
                
                if (upcomingApp.professional?.phoneE164) {
                   await sendTenantWhatsAppMessage({
                     tenantId: config.tenantId,
                     to: upcomingApp.professional.phoneE164,
                     text: `❌ *Cancelamento via WhatsApp*\nO cliente *${upcomingApp.client?.name}* acabou de cancelar o agendamento de hoje. O horário está livre novamente.`
                   });
                }
                
                if (startsWith2) {
                   await sendTenantWhatsAppMessage({
                     tenantId: config.tenantId,
                     to: phoneE164,
                     text: "❌ Seu agendamento foi cancelado com sucesso. Obrigado por avisar!"
                   });
                } else {
                   const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tratomarcado.com.br";
                   const manageLink = `${baseUrl}/s/${upcomingApp.tenant.slug}`;
                   await sendTenantWhatsAppMessage({
                     tenantId: config.tenantId,
                     to: phoneE164,
                     text: `🔄 Seu agendamento atual foi cancelado. Para remarcar um novo horário, acesse:\n${manageLink}`
                   });
                }
             }
          }
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: "event-not-used-yet" });
  } catch (error) {
    console.error("[WA_WEBHOOK_ERROR]", error);
    return NextResponse.json({ ok: true });
  }
}
