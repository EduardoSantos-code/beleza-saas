import { prisma } from "@/lib/prisma";
import { sendZap } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { addHours } from "date-fns";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // 1. Segurança: Verifique uma chave secreta para ninguém externo disparar seus envios
    const { searchParams } = new URL(req.url);
    const cronKey = searchParams.get("key");
    console.log("Chave que veio na URL:", cronKey);
    console.log("Chave que está no .env:", process.env.CRON_SECRET);
    if (cronKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Definir a "janela" de busca (daqui a exatas 2 horas)
    // Vamos buscar agendamentos que comecem entre 1h50 e 2h10 a partir de agora
    const now = new Date();
    const targetTimeStart = addHours(now, 1.8); // ~1h50min à frente
    const targetTimeEnd = addHours(now, 2.2);   // ~2h10min à frente

    // 3. Buscar no Prisma
    const appointmentsToRemind = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        startAt: {
          gte: targetTimeStart,
          lte: targetTimeEnd,
        },
        reminderSent: false, // Importante: criar esse campo no banco para não repetir o aviso
      },
      include: {
        client: true,
        tenant: true,
      },
    });

    // 4. Disparar as mensagens
    for (const app of appointmentsToRemind) {
      if (app.client?.phoneE164) {
        const timeLabel = app.startAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo"
        });

        const msgLembrete = `E aí, *${app.client.name}*! Passando pra lembrar que seu trato é **hoje**! ⏳\n\n` +
          `🕒 Às **${timeLabel}** na *${app.tenant?.name || 'Barbearia'}*.\n\n` +
          `*Já estamos preparando tudo. Não se atrase!* 👊🔥`;

        await sendZap(app.client.phoneE164, msgLembrete);

        // 5. Marcar como enviado para não mandar de novo no próximo ciclo do Cron
        await prisma.appointment.update({
          where: { id: app.id },
          data: { reminderSent: true },
        });
      }
    }

    return NextResponse.json({ sent: appointmentsToRemind.length });
  } catch (error) {
    console.error("Erro no Cron de Lembretes:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}