import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentMembershipBySlug } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "date é obrigatório" },
        { status: 400 }
      );
    }

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: membership.tenantId,
        startAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        client: true,
        service: true,
        professional: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      appointments: appointments.map((a) => ({
        id: a.id,
        startAt: a.startAt,
        endAt: a.endAt,
        status: a.status,
        notes: a.notes,
        client: {
          name: a.client.name,
          phoneE164: a.client.phoneE164,
        },
        service: {
          name: a.service.name,
          price: a.service.price,
          durationMin: a.service.durationMin,
        },
        professional: {
          name: a.professional.name,
        },
      })),
    });
  } catch (error) {
    console.error("Erro em /api/admin/[slug]/appointments:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar agendamentos" },
      { status: 500 }
    );
  }
}