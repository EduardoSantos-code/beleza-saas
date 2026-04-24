import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { formatBR } from "@/lib/date";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);
    if (!membership) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetDate = searchParams.get("date"); // Recebe ex: "2026-04-24"
    if (!targetDate) return NextResponse.json({ error: "Data não informada" }, { status: 400 });

    // A FORÇA BRUTA: Vamos criar uma janela de busca de 3 dias para não depender do banco
    // Pegamos do dia anterior até o dia seguinte
    const baseDate = new Date(`${targetDate}T12:00:00Z`); // Meio dia UTC como base segura
    const searchStart = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000); // -1 dia
    const searchEnd = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);   // +1 dia

    const [rawAppointments, professionals, servicesCount, professionalsCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: membership.tenantId,
          // Busca todo mundo dessa janela enorme de 3 dias
          startAt: { gte: searchStart, lte: searchEnd }, 
        },
        include: { client: true, service: true, professional: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.professional.findMany({
        where: { tenantId: membership.tenantId, active: true },
        select: { id: true, name: true }
      }),
      prisma.service.count({ where: { tenantId: membership.tenantId } }),
      prisma.professional.count({ where: { tenantId: membership.tenantId } }),
    ]);

    // O HACK: Filtramos na mão, dentro do JavaScript, usando o nosso formato de Brasília
    // Se o agendamento cair no dia exato no fuso de SP, ele passa. Senão, é ignorado.
    const filteredAppointments = rawAppointments.filter((app) => {
      const appDateBR = formatBR(app.startAt, "yyyy-MM-dd");
      return appDateBR === targetDate;
    });

    return NextResponse.json({
      tenant: { id: membership.tenant.id, name: membership.tenant.name },
      hasServices: servicesCount > 0,
      hasProfessionals: professionalsCount > 0,
      professionals,
      appointments: filteredAppointments.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        status: a.status,
        client: { name: a.client.name },
        service: { name: a.service.name },
        professional: { id: a.professional.id, name: a.professional.name },
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}