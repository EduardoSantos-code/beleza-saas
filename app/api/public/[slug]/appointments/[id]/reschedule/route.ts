import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";
import { formatInTimeZone } from "date-fns-tz";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";

function getBaseUrl(req: Request) {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

async function safeSendWhatsApp(
  label: string,
  payload: {
    tenantId: string;
    clientId?: string | null;
    to: string;
    text: string;
  }
) {
  try {
    const result = await sendTenantWhatsAppMessage(payload);
    if (!result.success) {
      console.error(label, result.reason, result.data);
    }
  } catch (error) {
    console.error(label, error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = await getClientSession(slug);

    if (!session) {
      return NextResponse.json(
        { error: "Sessão expirada. Identifique-se novamente." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { startAt, professionalId } = body;

    if (!startAt) {
      return NextResponse.json(
        { error: "Novo horário não selecionado." },
        { status: 400 }
      );
    }

    const startUtc = new Date(startAt);
    if (isNaN(startUtc.getTime())) {
      return NextResponse.json(
        { error: "Data do reagendamento inválida." },
        { status: 400 }
      );
    }

    // 1. Buscar o agendamento original
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        clientId: session.clientId,
        tenantId: session.tenantId,
      },
      include: {
        service: true,
        professional: true,
        client: true,
        tenant: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    if (appointment.status === "CANCELED" || appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Este agendamento já foi finalizado ou cancelado e não pode ser reagendado." },
        { status: 400 }
      );
    }

    const minAdvanceHours = appointment.tenant.minAdvanceHours ?? 2;
    const now = new Date();

    // 2. Verificar limite de antecedência para o agendamento antigo
    const cutoffOld = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
    if (appointment.startAt < cutoffOld) {
      return NextResponse.json(
        { error: `Não é possível reagendar agendamentos com menos de ${minAdvanceHours} horas de antecedência.` },
        { status: 400 }
      );
    }

    // 3. Verificar limite de antecedência para o novo horário
    if (startUtc < cutoffOld) {
      return NextResponse.json(
        { error: `O novo horário precisa ter pelo menos ${minAdvanceHours} horas de antecedência a partir de agora.` },
        { status: 400 }
      );
    }

    // 4. Se mudou o profissional, busca o novo profissional
    const targetProfessionalId = professionalId || appointment.professionalId;
    const targetProfessional = await prisma.professional.findFirst({
      where: { id: targetProfessionalId, tenantId: session.tenantId, active: true },
    });

    if (!targetProfessional) {
      return NextResponse.json(
        { error: "Profissional não disponível." },
        { status: 400 }
      );
    }

    // 5. Calcular tempos e datas
    const TZ = "America/Sao_Paulo";
    const endUtc = new Date(startUtc.getTime() + appointment.service.durationMin * 60000);
    const localTimeString = formatInTimeZone(startUtc, TZ, "HH:mm");
    const localDateString = formatInTimeZone(startUtc, TZ, "yyyy-MM-dd");

    const [hours, minutes] = localTimeString.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + appointment.service.durationMin;

    // 6. Verificar conflito de horário no novo slot (excluindo o próprio agendamento)
    const conflicts = await prisma.appointment.findMany({
      where: {
        tenantId: session.tenantId,
        professionalId: targetProfessionalId,
        status: { not: "CANCELED" },
        id: { not: id },
        startAt: { lt: endUtc },
        endAt: { gt: startUtc },
      },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "O horário selecionado já foi reservado." },
        { status: 400 }
      );
    }

    // 7. Verificar conflito com ScheduleBlocks (Bloqueios de agenda)
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        tenantId: session.tenantId,
        startAt: { lt: endUtc },
        endAt: { gt: startUtc },
        OR: [
          { professionalId: null },
          { professionalId: targetProfessionalId }
        ]
      },
    });

    if (blocks.length > 0) {
      return NextResponse.json(
        { error: "Este horário está bloqueado pelo profissional." },
        { status: 400 }
      );
    }

    // 8. Atualizar o agendamento no banco
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        professionalId: targetProfessionalId,
        startAt: startUtc,
        endAt: endUtc,
        businessDate: localDateString,
        startMinutes,
        endMinutes,
      },
      include: {
        professional: true,
        service: true,
        tenant: true,
        client: true,
      },
    });

    // 9. Enviar notificações por WhatsApp (se o tenant não estiver cancelado)
    if (updatedAppointment.tenant.subscriptionStatus !== "CANCELED") {
      const dateLabel = formatInTimeZone(updatedAppointment.startAt, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(updatedAppointment.startAt, TZ, "HH:mm");
      const baseUrl = getBaseUrl(req);
      const manageLink = `${baseUrl}/s/${slug}/a/${updatedAppointment.id}`;

      // Mensagem para o Barbeiro
      if (updatedAppointment.professional.phoneE164) {
        const msgBarbeiro =
          `🔄 *Agendamento Reagendado!*\n\n` +
          `Fala, *${updatedAppointment.professional.name}*, um cliente reagendou o horário:\n\n` +
          `👤 *Cliente:* ${updatedAppointment.client.name}\n` +
          `💈 *Serviço:* ${updatedAppointment.service.name}\n` +
          `📅 *Nova Data:* ${dateLabel}\n` +
          `🕒 *Novo Horário:* ${timeLabel}\n\n` +
          `Verifique sua agenda no painel do TratoMarcado.`;

        await safeSendWhatsApp("[RESCHEDULE_WHATSAPP_PROF_FAILURE]", {
          tenantId: session.tenantId,
          clientId: updatedAppointment.clientId,
          to: updatedAppointment.professional.phoneE164,
          text: msgBarbeiro,
        });
      }

      // Mensagem para o Cliente
      if (updatedAppointment.client.phoneE164) {
        const msgCliente =
          `Fala, *${updatedAppointment.client.name}*! ✂️\n\n` +
          `Seu agendamento foi *reagendado com sucesso* na *${updatedAppointment.tenant.name}*.\n\n` +
          `📅 *Nova Data:* ${dateLabel}\n` +
          `🕒 *Novo Horário:* ${timeLabel}\n` +
          `💈 *Profissional:* ${updatedAppointment.professional.name}\n\n` +
          `📄 *Detalhes do Agendamento:* ${manageLink}\n\n` +
          `Nos vemos em breve! 👊`;

        await safeSendWhatsApp("[RESCHEDULE_WHATSAPP_CLIENT_FAILURE]", {
          tenantId: session.tenantId,
          clientId: updatedAppointment.clientId,
          to: updatedAppointment.client.phoneE164,
          text: msgCliente,
        });
      }
    }

    return NextResponse.json({ ok: true, appointment: updatedAppointment });
  } catch (error) {
    console.error("[APPOINTMENT_RESCHEDULE_POST]", error);
    return NextResponse.json(
      { error: "Erro interno ao reagendar agendamento." },
      { status: 500 }
    );
  }
}
