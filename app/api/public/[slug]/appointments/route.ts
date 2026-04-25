import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { sendWhatsAppMessage } from "@/lib/whatsapp"; // Importando a nossa função nova

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { serviceId, professionalId, startAt, clientName, clientPhoneE164, notes } = body;

    // 1. VALIDAÇÃO DE SEGURANÇA
    if (!clientName || clientName.trim().length < 3) {
      return NextResponse.json({ error: "Nome inválido ou muito curto." }, { status: 400 });
    }
    if (!clientPhoneE164 || clientPhoneE164.trim().length < 12) {
      return NextResponse.json({ error: "Número de WhatsApp inválido." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados do agendamento inválidos." }, { status: 400 });
    }

    const TZ = "America/Sao_Paulo";
    const rawDate = startAt.split("T")[0];
    const rawTime = startAt.split("T")[1]?.substring(0, 5) || "00:00";
    const startUtc = fromZonedTime(`${rawDate}T${rawTime}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    const [hours, minutes] = rawTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    // 2. CRIA OU ATUALIZA O CLIENTE
    const clientRecord = await prisma.client.upsert({
      where: { tenantId_phoneE164: { tenantId: tenant.id, phoneE164: clientPhoneE164 } },
      update: { name: clientName },
      create: { tenantId: tenant.id, name: clientName, phoneE164: clientPhoneE164 }
    });

    // 3. CRIA O AGENDAMENTO NO BANCO
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        serviceId,
        professionalId,
        clientId: clientRecord.id,
        businessDate: rawDate,
        startMinutes,
        endMinutes,
        timeZone: TZ,
        startAt: startUtc,
        endAt: endUtc,
        notes,
        status: "CONFIRMED",
      }
    });

    // 4. DISPARO DO WHATSAPP (Evolution API)
    // Usamos um try/catch aqui para que, se o Zap falhar, o agendamento não seja cancelado
    try {
      const dateLabel = formatInTimeZone(startUtc, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(startUtc, TZ, "HH:mm");

      const message = `✅ *Agendamento Confirmado!*\n\nOlá *${clientName}*, seu horário na *${tenant.name}* foi reservado com sucesso.\n\n✂️ *Serviço:* ${service.name}\n📅 *Data:* ${dateLabel}\n⏰ *Hora:* ${timeLabel}\n\nTe esperamos lá!`;

      await sendWhatsAppMessage(clientPhoneE164, message);
    } catch (wsError) {
      console.error("❌ Erro ao enviar mensagem de WhatsApp:", wsError);
    }

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("❌ Erro interno na rota de agendamento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}