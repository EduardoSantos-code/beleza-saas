import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";

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
        await sendTenantWhatsAppMessage({
          tenantId: updatedApp.tenantId,
          to: updatedApp.professional.phoneE164,
          text: msgBarbeiro
        });
      }
      // Notifica Cliente
      if (updatedApp.client?.phoneE164) {
        const msgCliente = `❌ *Cancelamento Confirmado*\n\nOlá ${updatedApp.client?.name}, seu agendamento na *${updatedApp.tenant?.name}* para o dia ${dateLabel} às ${timeLabel} foi cancelado.`;
        await sendTenantWhatsAppMessage({
          tenantId: updatedApp.tenantId,
          to: updatedApp.client.phoneE164,
          text: msgCliente
        });
      }
    } else if (actionStatus === "COMPLETED") {
      // ✅ Se clicou em Finalizar (Mimo pro cliente!)
      if (updatedApp.client?.phoneE164) {
        let msgObrigado = `✂️ *Trato Feito!*\n\nFala *${updatedApp.client?.name}*, valeu por colar na *${updatedApp.tenant?.name}* hoje! 🔥\n\nEsperamos que tenha curtido o resultado. Até a próxima!`;
        
        if (updatedApp.tenant?.googleMapsLink) {
          msgObrigado = `Fala, ${updatedApp.client.name}! ✂️\n\n` +
            `Seu atendimento na *${updatedApp.tenant.name}* foi finalizado. Gostou do resultado?\n\n` +
            `Se puder, deixe uma avaliação pra gente no Google, isso ajuda muito o nosso trabalho: \n` +
            `${updatedApp.tenant.googleMapsLink}`;
        }

        await sendTenantWhatsAppMessage({
          tenantId: updatedApp.tenantId,
          to: updatedApp.client.phoneE164,
          text: msgObrigado
        });
      }
    }

    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error("🔥 Erro fatal ao atualizar agendamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}