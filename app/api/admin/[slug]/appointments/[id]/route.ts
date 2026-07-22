import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import { requireTenantAccess } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const appointmentId = resolvedParams.id;

    const currentMembership = await requireTenantAccess(slug);

    // 1. LENDO O QUE O FRONT-END MANDOU (COMPLETED ou CANCELED)
    const body = await req.json();
    const actionStatus = body.status;

    if (!appointmentId || !actionStatus) {
      return NextResponse.json({ error: "ID ou Status não encontrados" }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";

    // 2. BUSCAR DADOS DO AGENDAMENTO ATUAL
    const currentApp = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true }
    });

    if (!currentApp) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    // Se for STAFF, validar se o agendamento pertence ao profissional vinculado
    if (currentMembership.role === "STAFF") {
      const linkedProf = await prisma.professional.findFirst({
        where: {
          tenantId: currentMembership.tenantId,
          userId: currentMembership.userId,
        },
      });

      if (!linkedProf || currentApp.professionalId !== linkedProf.id) {
        return NextResponse.json(
          { error: "Acesso negado: você só pode alterar seus próprios agendamentos." },
          { status: 403 }
        );
      }
    }

    // 3. ATUALIZAR AGENDAMENTO E CLIENTE COM TRANSAÇÃO
    const timeDiffMs = currentApp.startAt.getTime() - Date.now();
    const isLateCancel = timeDiffMs < 30 * 60 * 1000;

    const [updatedApp] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: actionStatus },
        include: { professional: true, client: true, service: true, tenant: true },
      }),
      ...(actionStatus === "COMPLETED" ? [
        prisma.client.update({
          where: { id: currentApp.clientId },
          data: { completedCount: { increment: 1 } }
        })
      ] : []),
      ...(actionStatus === "NOSHOW" ? [
        prisma.client.update({
          where: { id: currentApp.clientId },
          data: { noShowCount: { increment: 1 } }
        })
      ] : []),
      ...(actionStatus === "CANCELED" && isLateCancel ? [
        prisma.client.update({
          where: { id: currentApp.clientId },
          data: { lateCancelCount: { increment: 1 } }
        })
      ] : [])
    ]);

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
        const msgObrigado = `✂️ *Trato Feito!*\n\nFala *${updatedApp.client?.name}*, valeu por colar na *${updatedApp.tenant?.name}* hoje! 🔥\n\nEsperamos que tenha curtido o resultado. Até a próxima!`;

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