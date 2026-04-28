import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

const sendEvolutionMessage = async (to: string, text: string) => {
  // Implementação da função de envio de mensagem
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const resolvedParams = await params;
    const appointmentId = resolvedParams.id;

    // 1. AGORA SIM: Lendo o status dinâmico que o Front-end mandou (COMPLETED ou CANCELED)
    const body = await req.json();
    const actionStatus = body.status;

    if (!appointmentId || !actionStatus) {
      return NextResponse.json({ error: "ID ou Status não fornecidos" }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";

    // 2. Atualiza o banco com o status correto (o que veio do botão)
    const updatedApp = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: actionStatus }, // <-- Substituímos o hardcode pela variável!
      include: { professional: true, client: true, service: true, tenant: true },
    });

    const dateLabel = formatInTimeZone(updatedApp.startAt, TZ, "dd/MM/yyyy");
    const timeLabel = formatInTimeZone(updatedApp.startAt, TZ, "HH:mm");

    // ==========================================
    // 3. FLUXO DO WHATSAPP (Baseado no botão clicado)
    // ==========================================

    if (actionStatus === "CANCELED") {
      // ❌ Se clicou em Cancelar
      if (updatedApp.professional?.phoneE164) {
        const msgBarbeiro = `❌ *Agendamento Cancelado*\n\nO cliente *${updatedApp.client?.name}* cancelou o horário de ${timeLabel} no dia ${dateLabel}.\n\nO horário já está livre na sua agenda.`;
        await sendEvolutionMessage(updatedApp.professional.phoneE164, msgBarbeiro);
      }
      if (updatedApp.client?.phoneE164) {
        const msgCliente = `❌ *Cancelamento Confirmado*\n\nOlá ${updatedApp.client?.name}, seu agendamento na *${updatedApp.tenant?.name}* para o dia ${dateLabel} às ${timeLabel} foi cancelado.`;
        await sendEvolutionMessage(updatedApp.client.phoneE164, msgCliente);
      }
    } else if (actionStatus === "COMPLETED") {
      // ✅ Se clicou em Finalizar (Mimo pro cliente!)
      if (updatedApp.client?.phoneE164) {
        const msgObrigado = `✂️ *Trato Feito!*\n\nFala *${updatedApp.client?.name}*, valeu por colar na *${updatedApp.tenant?.name}* hoje! 🔥\n\nEsperamos que tenha curtido o resultado. Até a próxima!`;
        await sendEvolutionMessage(updatedApp.client.phoneE164, msgObrigado);
      }
    }

    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error("🔥 Erro fatal ao mudar status do agendamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}