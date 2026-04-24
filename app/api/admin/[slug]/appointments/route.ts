import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);
    
    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // Recebe ex: 2026-04-24
    
    if (!date) {
      return NextResponse.json({ error: "Data não informada" }, { status: 400 });
    }

    // A mágica acontece aqui: filtramos direto pela coluna de texto da data
    const [appointments, professionals, servicesCount, professionalsCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: membership.tenantId,
          businessDate: date, 
        },
        include: { client: true, service: true, professional: true },
        orderBy: { startMinutes: "asc" }, 
      }),
      prisma.professional.findMany({
        where: { tenantId: membership.tenantId, active: true },
        select: { id: true, name: true }
      }),
      prisma.service.count({ where: { tenantId: membership.tenantId } }),
      prisma.professional.count({ where: { tenantId: membership.tenantId } }),
    ]);

    return NextResponse.json({
      tenant: { id: membership.tenant.id, name: membership.tenant.name },
      hasServices: servicesCount > 0,
      hasProfessionals: professionalsCount > 0,
      professionals,
      appointments: appointments.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        status: a.status,
        client: { name: a.client.name },
        service: { name: a.service.name },
        professional: { id: a.professional.id, name: a.professional.name },
      })),
    });
  } catch (error) {
    console.error("ERRO CRÍTICO API ADMIN:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}