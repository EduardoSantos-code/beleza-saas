import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { serviceId, professionalId, startAt, clientName, clientPhoneE164, notes } = body;

    // VALIDAÇÃO DE SEGURANÇA
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

    // 1. A MÁGICA: O front-end já envia a data certinha em UTC. 
    // Basta criar o objeto Date direto, sem quebrar o texto.
    const startUtc = new Date(startAt);
    
    // Se a data for inválida, barramos aqui
    if (isNaN(startUtc.getTime())) {
      return NextResponse.json({ error: "Data de agendamento inválida." }, { status: 400 });
    }

    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    // 2. Extraindo a hora e data local (Brasil) para salvar os minutos e o businessDate no banco
    const localTimeString = formatInTimeZone(startUtc, TZ, "HH:mm");
    const localDateString = formatInTimeZone(startUtc, TZ, "yyyy-MM-dd");

    const [hours, minutes] = localTimeString.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    const clientRecord = await prisma.client.upsert({
      where: { tenantId_phoneE164: { tenantId: tenant.id, phoneE164: clientPhoneE164 } },
      update: { name: clientName },
      create: { tenantId: tenant.id, name: clientName, phoneE164: clientPhoneE164 }
    });

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        serviceId,
        professionalId,
        clientId: clientRecord.id,
        businessDate: localDateString, 
        startMinutes,
        endMinutes,
        timeZone: TZ,
        startAt: startUtc, // Salva a data cravada
        endAt: endUtc,
        notes,
        status: "CONFIRMED",
      }
    });

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}