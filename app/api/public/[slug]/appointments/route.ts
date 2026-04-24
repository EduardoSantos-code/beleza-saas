import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

interface AppointmentBody {
  serviceId: string;
  professionalId: string;
  startAt: string;
  clientName: string;
  clientPhoneE164: string;
  notes?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await req.json()) as AppointmentBody;

    const { serviceId, professionalId, startAt, clientName, clientPhoneE164, notes } = body;

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";

    // 1. Extração limpa de Data e Hora (evita bugs de fuso do navegador)
    const rawDate = startAt.split("T")[0]; // Retorna "2026-04-24"
    const rawTime = startAt.split("T")[1]?.substring(0, 5) || "00:00"; // Retorna "09:00"

    // 2. Conversão para o instante UTC real para salvar no banco
    const startUtc = fromZonedTime(`${rawDate}T${rawTime}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    // 3. Cálculo dos minutos (A solução definitiva para a agenda)
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

    // 5. Cria o agendamento preenchendo TODOS os campos novos
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        serviceId,
        professionalId,
        clientId: clientRecord.id,
        
        // CAMPOS BLINDADOS (O que estava faltando no seu print)
        businessDate: rawDate,
        startMinutes: startMinutes,
        endMinutes: endMinutes,
        timeZone: TZ,

        // HORÁRIOS GLOBAIS
        startAt: startUtc,
        endAt: endUtc,

        notes,
        status: "CONFIRMED",
      },
      include: { professional: true, service: true, tenant: true, client: true }
    });

    // 6. Disparo de WhatsApp
    try {
      const token = process.env.WHATSAPP_MASTER_TOKEN;
      const phoneId = process.env.WHATSAPP_MASTER_PHONE_ID;

      if (token && phoneId) {
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

        const dateLabel = formatInTimeZone(startUtc, TZ, "dd/MM/yyyy");
        const timeLabel = formatInTimeZone(startUtc, TZ, "HH:mm");

        // Mensagem para o Cliente
        await fetch(url, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: clientPhoneE164,
            type: "text",
            text: { body: `✅ *Agendamento Confirmado!*\n\nOlá ${clientName}, seu horário na *${tenant.name}* foi reservado.\n\n📅 *Data:* ${dateLabel}\n⏰ *Hora:* ${timeLabel}\n\n_TratoMarcado_` }
          }),
        });

        // Mensagem para o Profissional
        if (professional.phoneE164) {
          await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: professional.phoneE164,
              type: "text",
              text: { body: `🚀 *Novo Agendamento!*\n\nEi ${professional.name}, você tem um novo cliente: ${clientName} às ${timeLabel} no dia ${dateLabel}.` }
            }),
          });
        }
      }
    } catch (wsError) {
      console.error("Erro no WhatsApp:", wsError);
    }

    return NextResponse.json(appointment);

  } catch (error: any) {
    console.error("ERRO CRÍTICO NA API:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}