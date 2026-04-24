import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    const start = new Date(startAt);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // 1. Cria ou atualiza o cliente
    const clientRecord = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: { tenantId: tenant.id, phoneE164: clientPhoneE164 }
      },
      update: { name: clientName },
      create: { tenantId: tenant.id, name: clientName, phoneE164: clientPhoneE164 }
    });

    // 2. Cria o agendamento
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        serviceId,
        professionalId,
        clientId: clientRecord.id,
        startAt: start,
        endAt: end,
        notes,
        status: "CONFIRMED",
      },
      include: { professional: true, service: true, tenant: true, client: true }
    });

    // 3. Disparo de WhatsApp (Envolvido em try/catch para não travar a API)
    try {
      const token = process.env.WHATSAPP_MASTER_TOKEN;
      const phoneId = process.env.WHATSAPP_MASTER_PHONE_ID;

      if (token && phoneId) {
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

        // Localize onde você define dateLabel e timeLabel e substitua:
        const dateLabel = start.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });

        const timeLabel = start.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        });

        // Mensagem Cliente
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

        // Mensagem Profissional
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
      console.error("Erro no disparo do WhatsApp, mas agendamento foi salvo:", wsError);
    }

    // SEMPRE retorna o agendamento como JSON, mesmo que o Zap falhe
    return NextResponse.json(appointment);

  } catch (error: any) {
    console.error("ERRO CRÍTICO NA API:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}