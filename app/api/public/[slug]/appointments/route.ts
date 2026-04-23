import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();

    const { 
      serviceId, 
      professionalId, 
      startAt, 
      clientName, 
      clientPhoneE164, 
      notes 
    } = body;

    // 1. Busca os dados completos para a mensagem
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 2. Calcula o horário de término
    const start = new Date(startAt);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // 3. Salva o agendamento no Banco de Dados
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        serviceId,
        professionalId,
        startAt: start,
        endAt: end,
        clientName,
        clientPhoneE164,
        notes,
        status: "CONFIRMED", // Já entra confirmado
      },
    });

    // ==========================================
    // LÓGICA DO WHATSAPP MASTER (CENTRALIZADO)
    // ==========================================
    
    async function sendWhatsApp(to: string, text: string) {
      try {
        const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_MASTER_PHONE_ID}/messages`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.WHATSAPP_MASTER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: text },
          }),
        });
      } catch (e) {
        console.error("Erro ao enviar Zap:", e);
      }
    }

    const dateLabel = start.toLocaleDateString("pt-BR");
    const timeLabel = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Enviar para o CLIENTE
    const clientMsg = `✅ *Agendamento Confirmado!*\n\nOlá ${clientName}, seu horário na *${tenant.name}* foi reservado com sucesso.\n\n📅 *Data:* ${dateLabel}\n⏰ *Hora:* ${timeLabel}\n✂️ *Serviço:* ${service.name}\n👤 *Profissional:* ${professional.name}\n\nLocal: ${tenant.address || 'No endereço do salão'}\n\n_Enviado via TratoMarcado_`;
    await sendWhatsApp(clientPhoneE164, clientMsg);

    // Enviar para o PROFISSIONAL
    if (professional.phoneE164) {
      const profMsg = `🚀 *Novo Agendamento!*\n\nEi ${professional.name}, você tem um novo cliente na agenda.\n\n👤 *Cliente:* ${clientName}\n📅 *Data:* ${dateLabel}\n⏰ *Hora:* ${timeLabel}\n✂️ *Serviço:* ${service.name}`;
      await sendWhatsApp(professional.phoneE164, profMsg);
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}