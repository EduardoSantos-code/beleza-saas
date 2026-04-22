import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const tenantId = membership.tenantId;

    // Busca apenas contagens válidas e numéricas
    const [totalAppointments, completedAppointments, totalClients] = await Promise.all([
      prisma.appointment.count({ where: { tenantId } }),
      prisma.appointment.count({ where: { tenantId, status: "COMPLETED" } }),
      prisma.client.count({ where: { tenantId } })
    ]);

    // Cálculo de Faturamento Real (Somando os preços dos serviços concluídos)
    const completedList = await prisma.appointment.findMany({
      where: { tenantId, status: "COMPLETED" },
      include: { service: true },
    });

    const totalRevenueCents = completedList.reduce((acc, curr) => acc + curr.service.priceCents, 0);

    // Top Serviços
    const servicesPerformance = await prisma.service.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { appointments: { where: { status: "COMPLETED" } } }
        }
      }
    });

    const topServices = servicesPerformance
      .map(s => ({
        name: s.name,
        count: s._count.appointments,
        revenue: (s._count.appointments * s.priceCents) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Desempenho por Profissional
    const professionalsPerformance = await prisma.professional.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { appointments: { where: { status: "COMPLETED" } } }
        }
      }
    });

    const topProfessionals = professionalsPerformance
      .map(p => ({
        name: p.name,
        count: p._count.appointments
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      summary: {
        totalAppointments,
        completedAppointments,
        totalClients,
        totalRevenue: totalRevenueCents / 100,
      },
      topServices,
      topProfessionals
    });
  } catch (error) {
    console.error("Erro ao carregar métricas:", error);
    return NextResponse.json({ error: "Erro interno ao processar métricas" }, { status: 500 });
  }
}