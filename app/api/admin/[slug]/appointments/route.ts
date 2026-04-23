import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Data não informada" }, { status: 400 });
    }

    // Define o começo e o fim do dia solicitado
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    // Busca os agendamentos e conta se há serviços e profissionais
    const [appointments, servicesCount, professionalsCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: membership.tenantId,
          startAt: { gte: start, lte: end },
        },
        include: { client: true, service: true, professional: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.service.count({ where: { tenantId: membership.tenantId } }),
      prisma.professional.count({ where: { tenantId: membership.tenantId } }),
    ]);

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      hasServices: servicesCount > 0,
      hasProfessionals: professionalsCount > 0,
      appointments: appointments.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        status: a.status,
        notes: a.notes,
        client: {
          name: a.client.name,
          phoneE164: a.client.phoneE164,
        },
        service: {
          name: a.service.name,
          priceCents: a.service.priceCents,
          durationMin: a.service.durationMin,
        },
        professional: {
          name: a.professional.name,
        },
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar agendamentos:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}