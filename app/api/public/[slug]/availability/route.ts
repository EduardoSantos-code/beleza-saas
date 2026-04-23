import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isTenantBillingActive } from "@/lib/billing";

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function getWeekdayFromDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return WEEKDAYS[d.getDay()];
}

function combineDateAndMinutes(date: string, minutes: number) {
  const d = new Date(`${date}T00:00:00`);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  d.setHours(hours, mins, 0, 0);
  return d;
}

function roundToNextSlot(date: Date, slotMinutes = 30) {
  const ms = slotMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const serviceId = searchParams.get("serviceId");
    const professionalId = searchParams.get("professionalId");
    const date = searchParams.get("date");

    if (!serviceId || !professionalId || !date) {
      return NextResponse.json(
        { error: "serviceId, professionalId e date são obrigatórios" },
        { status: 400 }
      );
    }

    const weekday = getWeekdayFromDate(date);

    const [tenant, service, professional, tenantHour, professionalHour] =
      await Promise.all([
        prisma.tenant.findUnique({
          where: { slug },
          select: { 
            id: true, 
            name: true, 
            timezone: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            subscriptionCurrentPeriodEnd: true,
            minAdvanceHours: true,
          },
        }),
        prisma.service.findFirst({
          where: { id: serviceId, active: true },
          select: { id: true, tenantId: true, durationMin: true, name: true },
        }),
        prisma.professional.findFirst({
          where: { id: professionalId, active: true },
          select: { id: true, tenantId: true, name: true },
        }),
        prisma.tenantBusinessHour.findFirst({
          where: {
            tenant: { slug },
            weekday,
          },
        }),
        prisma.professionalBusinessHour.findFirst({
          where: {
            professionalId,
            weekday,
          },
        }),
      ]);

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    if (!isTenantBillingActive(tenant)) {
      return NextResponse.json({ slots: [], meta: { reason: "subscription-inactive" } });
    }

    if (!service || service.tenantId !== tenant.id) {
      return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
    }

    if (!professional || professional.tenantId !== tenant.id) {
      return NextResponse.json({ error: "Profissional inválido" }, { status: 400 });
    }

    if (!tenantHour || !tenantHour.isOpen) {
      return NextResponse.json({ slots: [], meta: { reason: "tenant-closed" } });
    }

    if (professionalHour && !professionalHour.isOpen) {
      return NextResponse.json({ slots: [], meta: { reason: "professional-closed" } });
    }

    const effectiveStartMin = Math.max(
      tenantHour.startMin ?? 0,
      professionalHour?.startMin ?? tenantHour.startMin ?? 0
    );

    const effectiveEndMin = Math.min(
      tenantHour.endMin ?? 0,
      professionalHour?.endMin ?? tenantHour.endMin ?? 0
    );

    const dayStart = combineDateAndMinutes(date, effectiveStartMin);
    const dayEnd = combineDateAndMinutes(date, effectiveEndMin);

    // ==========================================
    // CÁLCULO DOS INTERVALOS (ALMOÇO)
    // ==========================================
    // Pegamos o intervalo do profissional. Se ele não tiver, pegamos o do salão.
    const breakStartMin = professionalHour?.breakStartMin ?? tenantHour.breakStartMin;
    const breakEndMin = professionalHour?.breakEndMin ?? tenantHour.breakEndMin;

    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;

    if (breakStartMin != null && breakEndMin != null) {
      breakStart = combineDateAndMinutes(date, breakStartMin);
      breakEnd = combineDateAndMinutes(date, breakEndMin);
    }

    const [appointments, blocks] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: tenant.id,
          professionalId: professional.id,
          status: { not: "CANCELED" }, 
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
      prisma.scheduleBlock.findMany({
        where: {
          tenantId: tenant.id,
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
          OR: [
            { professionalId: null },
            { professionalId: professional.id },
          ],
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const realNow = new Date();
    const tenantTimezone = tenant.timezone || "America/Sao_Paulo";
    const nowInBrazilString = realNow.toLocaleString("en-US", { timeZone: tenantTimezone });
    const localNow = new Date(nowInBrazilString);

    const minAdvanceHours = tenant.minAdvanceHours ?? 2;
    const cutoffTime = new Date(localNow.getTime() + minAdvanceHours * 60 * 60 * 1000);

    const slots: { iso: string; label: string }[] = [];
    let cursor = roundToNextSlot(dayStart, 30);

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + service.durationMin * 60 * 1000);

      const fitsInHours = slotEnd <= dayEnd;
      const isFuture = cursor > cutoffTime;

      // ==========================================
      // NOVA TRAVA: VERIFICA SE CAI NO INTERVALO
      // ==========================================
      let fallsInBreak = false;
      if (breakStart && breakEnd) {
        fallsInBreak = overlaps(cursor, slotEnd, breakStart, breakEnd);
      }

      const appointmentConflict = appointments.some((appointment) =>
        overlaps(cursor, slotEnd, appointment.startAt, appointment.endAt)
      );

      const blockConflict = blocks.some((block) =>
        overlaps(cursor, slotEnd, block.startAt, block.endAt)
      );

      // Só adiciona se NÃO cair no intervalo
      if (fitsInHours && isFuture && !fallsInBreak && !appointmentConflict && !blockConflict) {
        slots.push({
          iso: cursor.toISOString(),
          label: cursor.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        });
      }

      cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
    }

    return NextResponse.json({ slots, meta: { date } });
  } catch (error) {
    console.error("Erro em availability:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}