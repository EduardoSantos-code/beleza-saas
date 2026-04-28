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

    // 1. LENDO O QUE O FRONT-END MANDOU (COMPLETED ou CANCELED)
    const body = await req.json();
    const actionStatus = body.status;

    if (!appointmentId || !actionStatus) {
      return NextResponse.json({ error: "ID ou Status não encontrados" }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";

    // 2. ATUALIZANDO COM A VARIÁVEL CORRETA
    const updatedApp = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: actionStatus }, // ✅ Agora ele usa o status do botão!
      include: { professional: true, client: true, service: true, tenant: true },
    });

    const dateLabel = formatInTimeZone(updatedApp.startAt, TZ, "dd/MM/yyyy");
    const timeLabel = formatInTimeZone(updatedApp.startAt, TZ, "HH:mm");

    // 3. FLUXO INTELIGENTE DO WHATSAPP
    if (actionStatus === "CANCELED") {
      // Notifica Barbeiro
      if (updatedApp.professional?.phoneE164) {
        const msgBarbeiro = `❌ *Agendamento Cancelado*\n\nO cliente *${updatedApp.client?.name}* cancelou o horário de ${timeLabel} no dia ${dateLabel}.\n\nO horário já está livre na sua agenda.`;
        await sendEvolutionMessage(updatedApp.professional.phoneE164, msgBarbeiro);
      }
      // Notifica Cliente
      if (updatedApp.client?.phoneE164) {
        const msgCliente = `❌ *Cancelamento Confirmado*\n\nOlá ${updatedApp.client?.name}, seu agendamento na *${updatedApp.tenant?.name}* para o dia ${dateLabel} às ${timeLabel} foi cancelado.`;
        await sendEvolutionMessage(updatedApp.client.phoneE164, msgCliente);
      }
    } else if (actionStatus === "COMPLETED") {
      // Agradece Cliente (Apenas se finalizou com sucesso)
      if (updatedApp.client?.phoneE164) {
        const msgObrigado = `✂️ *Trato Feito!*\n\nFala *${updatedApp.client?.name}*, valeu por colar na *${updatedApp.tenant?.name}* hoje! 🔥\n\nEsperamos que tenha curtido o resultado. Até a próxima!`;
        await sendEvolutionMessage(updatedApp.client.phoneE164, msgObrigado);
      }
    }

    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error("🔥 Erro fatal ao atualizar agendamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}