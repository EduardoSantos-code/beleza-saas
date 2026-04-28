import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

const sendEvolutionMessage = async (to: string, text: string) => {
  try {
    const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`;
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!process.env.EVOLUTION_API_URL || !apiKey) return;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": apiKey },
      body: JSON.stringify({
        number: to,
        text: text,
        delay: 1000,
      }),
    });
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
  }
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const resolvedParams = await params;
    const appointmentId = resolvedParams.id;

    if (!appointmentId) {
      return NextResponse.json({ error: "ID não encontrada na URL" }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";

    const cancelledApp = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELED" },
      include: { professional: true, client: true, service: true, tenant: true },
    });

    const dateLabel = formatInTimeZone(cancelledApp.startAt, TZ, "dd/MM/yyyy");
    const timeLabel = formatInTimeZone(cancelledApp.startAt, TZ, "HH:mm");

    // 1. NOTIFICAR BARBEIRO (Cancelamento)
    if (cancelledApp.professional?.phoneE164) {
      const msgBarbeiro = `❌ *Agendamento Cancelado*\n\nO cliente *${cancelledApp.client?.name}* cancelou o horário de ${timeLabel} no dia ${dateLabel}.\n\nO horário já está livre na sua agenda.`;
      await sendEvolutionMessage(cancelledApp.professional?.phoneE164, msgBarbeiro);
    }

    // 2. NOTIFICAR CLIENTE (Confirmação de Cancelamento)
    if (cancelledApp.client?.phoneE164) {
      const msgCliente = `❌ *Cancelamento Confirmado*\n\nOlá ${cancelledApp.client?.name}, seu agendamento na *${cancelledApp.tenant?.name}* para o dia ${dateLabel} às ${timeLabel} foi cancelado.`;
      await sendEvolutionMessage(cancelledApp.client?.phoneE164, msgCliente);
    }

    return NextResponse.json(cancelledApp);
  } catch (error) {
    console.error("🔥 Erro fatal ao cancelar agendamento:", error);
    return NextResponse.json({ error: "Erro ao cancelar" }, { status: 500 });
  }
}