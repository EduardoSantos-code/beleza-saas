import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { sendZap } from "@/lib/whatsapp";

interface BookBody {
  serviceId: string;
  professionalId: string;
  startAt: string;
  clientName: string;
  clientPhoneE164: string;
  notes?: string;
}

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await req.json()) as BookBody;

    const { serviceId, professionalId, startAt, clientName, clientPhoneE164, notes } = body;

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";

    // 1. EXTRAÇÃO DAS STRINGS (Blindagem contra fuso)
    const rawDate = startAt.split("T")[0]; // "2026-04-24"
    const rawTime = startAt.split("T")[1]?.substring(0, 5) || "00:00"; // "09:00"

    // 2. CONVERSÃO PARA UTC REAL
    const startUtc = fromZonedTime(`${rawDate}T${rawTime}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    // 3. CÁLCULO DOS MINUTOS DO DIA (O que o Prisma está exigindo)
    const [hours, minutes] = rawTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    // 4. Cria ou atualiza o cliente
    const clientRecord = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: { tenantId: tenant.id, phoneE164: clientPhoneE164 }
      },
      update: { name: clientName },
      create: { tenantId: tenant.id, name: clientName, phoneE164: clientPhoneE164 }
    });

    // 5. CRIAÇÃO DO AGENDAMENTO (Agora com todos os campos obrigatórios)
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        professionalId: professional.id,
        serviceId: service.id,
        clientId: clientRecord.id,
        
        // CAMPOS DO NEGÓCIO (Solução definitiva)
        businessDate: rawDate,
        startMinutes: startMinutes,
        endMinutes: endMinutes,
        timeZone: TZ,

        // HORÁRIOS GLOBAIS
        startAt: startUtc,
        endAt: endUtc,

        notes: notes || null,
        status: "CONFIRMED",
      },
      include: { professional: true, service: true, tenant: true, client: true }
    });

    // 6. WhatsApp Notification
    try {
      const dateLabel = formatInTimeZone(startUtc, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(startUtc, TZ, "HH:mm");

      // NOTIFICAR BARBEIRO
      if (appointment.professional?.phoneE164) {
        const msgBarbeiro = `🚨 *Novo Cliente na área!*\n\n` +
          `Fala, *${appointment.professional.name}*, você tem um novo agendamento:\n\n` +
          `👤 *Cliente:* ${appointment.client?.name}\n` +
          `💈 *Serviço:* ${appointment.service?.name}\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}\n\n` +
          `Dá uma olhada na sua agenda completa no painel do TratoMarcado.`;

        await sendZap(appointment.professional.phoneE164, msgBarbeiro);
      }

      // NOTIFICAR CLIENTE
      if (appointment.client?.phoneE164) {
        const msgCliente = `Fala, ${appointment.client.name}! ✂️\n\n` +
          `Seu trato tá oficialmente marcado na *${appointment.tenant?.name}*.\n\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}\n` +
          `💈 *Barbeiro:* ${appointment.professional?.name}\n\n` +
          `Dica: Se precisar desmarcar, avise a gente com antecedência. Nos vemos em breve! 👊`;

        await sendZap(appointment.client.phoneE164, msgCliente);
      }
    } catch (e) {
      console.error("Erro ao avisar o barbeiro:", e);
    }

    return NextResponse.json(appointment);

  } catch (error: any) {
    console.error("Erro na rota book:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { appointmentId } = await req.json();
    const TZ = "America/Sao_Paulo";

    const cancelledApp = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELED" },
      include: { 
        professional: true, 
        client: true,
        tenant: true,
        service: true 
      },
    });

    // WhatsApp Notification for Cancellation
    try {
      const dateLabel = formatInTimeZone(cancelledApp.startAt, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(cancelledApp.startAt, TZ, "HH:mm");

      // 1. NOTIFICAR BARBEIRO (Cancelamento)
      if (cancelledApp.professional?.phoneE164) {
        const msgBarbeiro = `❌ *Horário Liberado!*\n\nO cliente *${cancelledApp.client?.name}* cancelou o horário das ${timeLabel} no dia ${dateLabel}. Esse horário já voltou para a sua agenda e está disponível para novos agendamentos. 🔄`;
        await sendEvolutionMessage(cancelledApp.professional?.phoneE164, msgBarbeiro);
      }

      // 2. NOTIFICAR CLIENTE (Confirmação de Cancelamento)
      if (cancelledApp.client?.phoneE164) {
        const msgCliente = `❌ *Cancelamento Confirmado*\n\n` +
          `Olá ${cancelledApp.client?.name}, seu agendamento na *${cancelledApp.tenant?.name}* para o dia ${dateLabel} às ${timeLabel} foi cancelado.`;
        await sendEvolutionMessage(cancelledApp.client?.phoneE164, msgCliente);
      }
    } catch (e) {
      console.error("Erro zap cancelamento:", e);
    }

    return NextResponse.json(cancelledApp);
  } catch (error: any) {
    console.error("Erro no cancelamento:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar agendamento" },
      { status: 500 }
    );
  }
}