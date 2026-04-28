import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isTenantBillingActive } from "@/lib/billing";

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

function getWeekdayFromDate(dateStr: string) {
  // Força 12h no fuso do Brasil para garantir que não pule para o dia anterior
  const d = new Date(`${dateStr}T12:00:00-03:00`);
  return WEEKDAYS[d.getDay()];
}

// Essa função impede que o Node.js use o horário UTC do servidor
function buildBrazilDate(dateStr: string, minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  // A string "YYYY-MM-DDTHH:mm:00-03:00" crava o fuso de Brasília
  return new Date(`${dateStr}T${hours}:${mins}:00-03:00`);
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
      return NextResponse.json({ error: "Faltam parâmetros" }, { status: 400 });
    }

    const weekday = getWeekdayFromDate(date);

    const [tenant, service, professional, tenantHour, professionalHour] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug }, select: { id: true, subscriptionStatus: true, trialEndsAt: true, minAdvanceHours: true } }),
      prisma.service.findFirst({ where: { id: serviceId, active: true }, select: { id: true, tenantId: true, durationMin: true } }),
      prisma.professional.findFirst({ where: { id: professionalId, active: true }, select: { id: true, tenantId: true } }),
      prisma.tenantBusinessHour.findFirst({ where: { tenant: { slug }, weekday } }),
      prisma.professionalBusinessHour.findFirst({ where: { professionalId, weekday } }),
    ]);

    if (!tenant || !isTenantBillingActive(tenant)) return NextResponse.json({ slots: [], meta: { reason: "inactive" } });
    if (!service || !professional) return NextResponse.json({ error: "Inválido" }, { status: 400 });

    // Se o salão ou o prof estiverem fechados neste dia, vaza
    if (!tenantHour || !tenantHour.isOpen || (professionalHour && !professionalHour.isOpen)) {
      return NextResponse.json({ slots: [], meta: { reason: "closed" } });
    }

    // Calcula os minutos com fallback seguro (1439 = 23:59)
    const effectiveStartMin = Math.max(tenantHour.startMin ?? 0, professionalHour?.startMin ?? 0);
    const effectiveEndMin = Math.min(tenantHour.endMin ?? 1439, professionalHour?.endMin ?? tenantHour.endMin ?? 1439);

    const dayStart = buildBrazilDate(date, effectiveStartMin);
    const dayEnd = buildBrazilDate(date, effectiveEndMin);

    const breakStartMin = professionalHour?.breakStartMin ?? tenantHour.breakStartMin;
    const breakEndMin = professionalHour?.breakEndMin ?? tenantHour.breakEndMin;

    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;

    if (breakStartMin != null && breakEndMin != null) {
      breakStart = buildBrazilDate(date, breakStartMin);
      breakEnd = buildBrazilDate(date, breakEndMin);
    }

    const [appointments, blocks] = await Promise.all([
      prisma.appointment.findMany({
        where: { tenantId: tenant.id, professionalId: professional.id, status: { not: "CANCELED" }, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
        select: { startAt: true, endAt: true },
      }),
      prisma.scheduleBlock.findMany({
        where: { tenantId: tenant.id, startAt: { lt: dayEnd }, endAt: { gt: dayStart }, OR: [{ professionalId: null }, { professionalId: professional.id }] },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const realNow = new Date();
    const minAdvanceHours = tenant.minAdvanceHours ?? 2;
    const cutoffTime = new Date(realNow.getTime() + (minAdvanceHours * 60 * 60 * 1000));

    const slots: { iso: string; label: string }[] = [];
    let cursor = roundToNextSlot(dayStart, 30);
    const duration = service.durationMin || 30;

    console.log(`\n=== GERANDO SLOTS PARA ${date} (${weekday}) ===`);

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);

      const fitsInHours = slotEnd <= dayEnd;
      const isFuture = cursor > cutoffTime;
      const fallsInBreak = (breakStart && breakEnd) ? overlaps(cursor, slotEnd, breakStart, breakEnd) : false;
      const appointmentConflict = appointments.some(app => overlaps(cursor, slotEnd, app.startAt, app.endAt));
      const blockConflict = blocks.some(block => overlaps(cursor, slotEnd, block.startAt, block.endAt));

      if (fitsInHours && isFuture && !fallsInBreak && !appointmentConflict && !blockConflict) {
        slots.push({
          iso: cursor.toISOString(),
          label: cursor.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
        });
      } else {
         // Retire as duas barras "//" da linha de baixo se quiser ver no terminal EXATAMENTE porque um horário sumiu
         console.log(`Rejeitado: ${cursor.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })} | isFuture=${isFuture}, fallsInBreak=${fallsInBreak}, appConflict=${appointmentConflict}`);
      }

      cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
    }

    console.log(`Total de slots válidos encontrados: ${slots.length}`);
    return NextResponse.json({ slots, meta: { date } });
  } catch (error) {
    console.error("Erro em availability:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}