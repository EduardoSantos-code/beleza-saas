import { prisma } from "@/lib/prisma";
import { sendZap } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { addHours, startOfMinute } from "date-fns";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // 1. Segurança
    const { searchParams } = new URL(req.url);
    const cronKey = searchParams.get("key");
    if (cronKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Definir a janela de tempo
    const agora = new Date();
    const daquiADuasHoras = addHours(agora, 2);

    // 3. Buscar no Prisma com filtro de tempo
    const appointmentsToRemind = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSent: false,
        // O segredo está aqui:
        startAt: {
          gte: agora,           // O agendamento ainda não começou
          lte: daquiADuasHoras, // O agendamento começa em no máximo 2 horas
        },
      },
      include: {
        client: true,
        tenant: true,
      },
    });

    console.log(`[Reminders] Encontrados ${appointmentsToRemind.length} lembretes para enviar.`);

    // 4. Disparar as mensagens
    for (const app of appointmentsToRemind) {
      if (app.client?.phoneE164) {
        const timeLabel = app.startAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: app.timeZone || "America/Sao_Paulo"
        });

        const msgLembrete = 
          `E aí, *${app.client.name}*! Passando pra lembrar que seu trato é **hoje**! ⏳\n\n` +
          `🕒 Às **${timeLabel}** na *${app.tenant?.name || 'Barbearia'}*.\n\n` +
          `*Já estamos preparando tudo. Não se atrase!* 👊🔥`;

        await sendZap(app.client.phoneE164, msgLembrete);

        // 5. Marcar como enviado
        await prisma.appointment.update({
          where: { id: app.id },
          data: { reminderSent: true },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent: appointmentsToRemind.length 
    });

  } catch (error) {
    console.error("Erro no Cron de Lembretes:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}