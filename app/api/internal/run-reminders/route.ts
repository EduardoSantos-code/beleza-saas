import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { logWhatsAppOutboundMessage } from "@/lib/whatsapp-log";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecretHeader = req.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET) return false;

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (cronSecretHeader === process.env.CRON_SECRET) return true;

  return false;
}

async function runReminderJob() {
  const reminders = await prisma.reminder.findMany({
    where: {
      status: "PENDING",
      sendAt: {
        lte: new Date(),
      },
    },
    include: {
      appointment: {
        include: {
          tenant: {
            include: {
              whatsappConfig: true,
            },
          },
          client: true,
          service: true,
          professional: true,
        },
      },
    },
    take: 50,
    orderBy: {
      sendAt: "asc",
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    try {
      const appointment = reminder.appointment;
      const config = appointment.tenant.whatsappConfig;

      if (!config) {
        skipped++;

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            error: "WhatsApp não configurado para este salão",
          },
        });

        continue;
      }

      const reminderText =
        `Olá, ${appointment.client.name}! Passando para lembrar do seu agendamento.\n\n` +
        `Salão: ${appointment.tenant.name}\n` +
        `Serviço: ${appointment.service.name}\n` +
        `Profissional: ${appointment.professional.name}\n` +
        `Data e hora: ${formatDateTime(appointment.startAt)}\n\n` +
        `Até breve!`;

      const waResponse = await sendWhatsAppText({
        phoneNumberId: config.phoneNumberId,
        accessToken: config.accessToken,
        to: appointment.client.phoneE164,
        text: reminderText,
      });

      await logWhatsAppOutboundMessage({
        tenantId: appointment.tenant.id,
        clientId: appointment.client.id,
        phoneNumberId: config.phoneNumberId,
        toPhoneE164: appointment.client.phoneE164,
        textBody: reminderText,
        waMessageId: waResponse?.messages?.[0]?.id ?? null,
        rawJson: waResponse,
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: "SENT",
          attempts: {
            increment: 1,
          },
          error: null,
        },
      });

      sent++;
    } catch (error: any) {
      console.error("Erro ao enviar reminder:", error);

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: "FAILED",
          attempts: {
            increment: 1,
          },
          error: error?.message || "Erro desconhecido",
        },
      });

      failed++;
    }
  }

  return {
    ok: true,
    processed: reminders.length,
    sent,
    failed,
    skipped,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await runReminderJob();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await runReminderJob();
  return NextResponse.json(result);
}