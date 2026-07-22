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

    // 6.5. Buscamos as reservas de produtos criadas na data consultada (America/Sao_Paulo timezone)
    let productReservations: any[] = [];
    if (date) {
      const start = new Date(`${date}T00:00:00-03:00`);
      const end = new Date(`${date}T23:59:59.999-03:00`);

      productReservations = await prisma.productReservation.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          client: {
            select: {
              name: true,
              phoneE164: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // 6.7. Horários de funcionamento do salão
    const businessHours = await prisma.tenantBusinessHour.findMany({
      where: { tenantId: tenant.id },
    });

    // 6.8. Bloqueios gerais do salão no dia consultado
    let blocks: any[] = [];
    if (date) {
      const start = new Date(`${date}T00:00:00-03:00`);
      const end = new Date(`${date}T23:59:59.999-03:00`);
      blocks = await prisma.scheduleBlock.findMany({
        where: {
          tenantId: tenant.id,
          startAt: { lt: end },
          endAt: { gt: start },
        },
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          allDay: true,
          professionalId: true,
        },
      });
    }

    // 7. RETORNO COMPLETO
    return NextResponse.json({
      tenant,
      appointments: formattedAppointments,
      professionals,
      services, // Enviando a lista para o barbeiro escolher no modal
      announcement,
      productReservations,
      businessHours,
      blocks,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const currentMembership = await requireTenantAccess(slug);
    if (currentMembership.role === "STAFF") {
      return NextResponse.json({ error: "Acesso negado: permissão insuficiente" }, { status: 403 });
    }

    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Data não fornecida" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        businessDate: date,
        status: { in: ["PENDING", "CONFIRMED"] }
      },
      select: {
        id: true,
        clientId: true
      }
    });

    if (appointments.length === 0) {
      return NextResponse.json({ message: "Nenhum agendamento pendente ou confirmado para finalizar nesta data." });
    }

    const actualIdsToUpdate = appointments.map((a) => a.id);

    const updateOperations = [
      prisma.appointment.updateMany({
        where: { id: { in: actualIdsToUpdate } },
        data: { status: "COMPLETED" }
      }),
      ...Object.entries(
        appointments.reduce((acc, app) => {
          if (app.clientId) {
            acc[app.clientId] = (acc[app.clientId] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      ).map(([clientId, count]) =>
        prisma.client.update({
          where: { id: clientId },
          data: { completedCount: { increment: count } }
        })
      )
    ];

    await prisma.$transaction(updateOperations);

    return NextResponse.json({
      success: true,
      message: `${actualIdsToUpdate.length} agendamentos finalizados com sucesso.`
    });

  } catch (error) {
    console.error("🔥 Erro fatal ao finalizar agendamentos em lote:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}