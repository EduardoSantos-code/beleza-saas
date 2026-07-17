import { prisma } from "@/lib/prisma";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { addHours } from "date-fns";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const cronKey = searchParams.get("key");

    const isAuthorized =
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      cronKey === process.env.CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }


    const agora = new Date();
    const daquiADuasHoras = addHours(agora, 2);

    const appointmentsToRemind = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSent: false,
        startAt: {
          gte: agora,
          lte: daquiADuasHoras,
        },
        tenant: {
          subscriptionStatus: {
            not: "CANCELED",
          },
        },
      },
      include: {
        client: true,
        tenant: true,
      },
    });

    console.log(
      `[Reminders] Encontrados ${appointmentsToRemind.length} lembretes para enviar.`
    );

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const app of appointmentsToRemind) {
      const advanceMinutes = (app.startAt.getTime() - app.createdAt.getTime()) / (1000 * 60);
      
      // Skip reminder if booked less than 2 hours in advance
      if (advanceMinutes < 120) {
        await prisma.appointment.update({
          where: { id: app.id },
          data: { reminderSent: true },
        });
        skippedCount++;
        console.log(`[Reminders] Ignorado: agendamento ${app.id} criado muito em cima da hora.`);
        continue;
      }

      if (!app.client?.phoneE164) {
        skippedCount++;
        console.error("[REMINDER_WHATSAPP_TEMPORARY_FAILURE]", "CLIENT_WITHOUT_PHONE", {
          appointmentId: app.id,
          clientId: app.clientId,
        });
        continue;
      }

      const timeLabel = app.startAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: app.timeZone || "America/Sao_Paulo",
      });

      const clientName = app.client.name || "cliente";

      const msgLembrete =
        `E aí, *${clientName}*! Passando pra lembrar que seu trato é **hoje**! ⏳\n\n` +
        `🕒 Às **${timeLabel}** na *${app.tenant?.name || "Barbearia"}*.\n\n` +
        `Por favor, nos confirme:\n` +
        `*1* - Confirmar Presença ✅\n` +
        `*2* - Cancelar Agendamento ❌\n` +
        `*3* - Remarcar Horário 🔄\n\n` +
        `*Responda com o número da opção.* 👊🔥`;

      try {
        const result = await sendTenantWhatsAppMessage({
          tenantId: app.tenantId,
          clientId: app.clientId,
          to: app.client.phoneE164,
          text: msgLembrete,
        });

        if (!result.success) {
          failedCount++;
          console.error(
            "[REMINDER_WHATSAPP_TEMPORARY_FAILURE]",
            result.reason,
            result.data
          );
          continue;
        }

        await prisma.appointment.update({
          where: { id: app.id },
          data: { reminderSent: true },
        });

        sentCount++;
      } catch (waError) {
        failedCount++;
        console.error("[REMINDER_WHATSAPP_TEMPORARY_FAILURE]", waError);
      }
    }

    return NextResponse.json({
      success: true,
      found: appointmentsToRemind.length,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Erro no Cron de Lembretes:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
