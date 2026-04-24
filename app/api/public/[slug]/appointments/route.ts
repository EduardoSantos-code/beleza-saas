import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

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
    const rawDate = startAt.split("T")[0];
    const rawTime = startAt.split("T")[1]?.substring(0, 5) || "00:00";
    const startUtc = fromZonedTime(`${rawDate}T${rawTime}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    const [hours, minutes] = rawTime.split(":").map(Number);
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

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}