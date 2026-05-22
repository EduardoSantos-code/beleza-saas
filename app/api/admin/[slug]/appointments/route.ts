import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await requireTenantAccess(slug);

    // 1. Pegamos a data que vem na URL (?date=2026-05-03)
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    // 2. Buscamos o salão (Tenant)
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true,
        slug: true,
        primaryColor: true,
        logoUrl: true,
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    // 3. BUSCA DO AVISO GLOBAL (A novidade está aqui!)
    const announcement = await prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { content: true } // Só precisamos do texto
    });

    // 4. Buscamos os agendamentos
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        businessDate: date || undefined,
        professional: { active: true },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    // Mapeamento para garantir consistência de nomes e campos do clube
    const formattedAppointments = appointments.map((appointment) => {
      return {
        id: appointment.id,
        status: appointment.status,
        startAt: appointment.startAt,
        startsAt: appointment.startAt, // Padronização para o front-end
        endAt: appointment.endAt,
        notes: appointment.notes,
        clubSubscriptionId: appointment.clubSubscriptionId,
        clubPlanName: appointment.clubPlanName,
        clubOriginalPrice: appointment.clubOriginalPrice,
        clubDiscountAmount: appointment.clubDiscountAmount,
        clubFinalPrice: appointment.clubFinalPrice,
        presenceConfirmed: appointment.presenceConfirmed,
        client: appointment.client ? {
          id: appointment.client.id,
          name: appointment.client.name,
          phoneE164: appointment.client.phoneE164,
          noShowCount: appointment.client.noShowCount,
          lateCancelCount: appointment.client.lateCancelCount,
          completedCount: appointment.client.completedCount,
        } : null,
        professional: appointment.professional ? {
          id: appointment.professional.id,
          name: appointment.professional.name,
        } : null,
        service: appointment.service ? {
          id: appointment.service.id,
          name: appointment.service.name,
          price: appointment.service.price,
          durationMin: appointment.service.durationMin,
        } : null,
      };
    });

    // 5. Buscamos todos os serviços (Necessário para o Modal de Agendamento Manual)
    const services = await prisma.service.findMany({
      where: {
        tenantId: tenant.id,
        active: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        durationMin: true,
      }
    });

    // 6. Buscamos profissionais
    const professionals = await prisma.professional.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
      },
    });

    // 7. RETORNO COMPLETO
    return NextResponse.json({
      tenant,
      appointments: formattedAppointments,
      professionals,
      services, // Enviando a lista para o barbeiro escolher no modal
      announcement
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}