import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(_req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [reviews, totalReviews, avgResult, totalServicesRendered] = await Promise.all([
      prisma.review.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          clientName: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      }),
      prisma.review.count({ where: { tenantId: tenant.id } }),
      prisma.review.aggregate({
        where: { tenantId: tenant.id },
        _avg: { rating: true },
      }),
      prisma.appointment.count({
        where: {
          tenantId: tenant.id,
          status: "COMPLETED",
        },
      }),
    ]);

    const averageRating = avgResult._avg.rating
      ? Math.round(avgResult._avg.rating * 10) / 10
      : 0;

    return NextResponse.json({
      reviews,
      stats: {
        averageRating,
        totalReviews,
        totalServicesRendered,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalReviews / limit),
      },
    });
  } catch (error) {
    console.error("Erro em GET /api/public/[slug]/reviews:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { appointmentId, phoneE164, clientName, rating, comment } = body;

    if (!appointmentId || !phoneE164 || !clientName || !rating) {
      return NextResponse.json(
        { error: "Campos obrigatórios: appointmentId, phoneE164, clientName, rating" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "A nota deve ser um número inteiro entre 1 e 5." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    // Verify appointment exists, belongs to tenant, and is COMPLETED
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId: tenant.id,
        status: "COMPLETED",
      },
      select: {
        id: true,
        clientId: true,
        review: { select: { id: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou ainda não foi concluído." },
        { status: 404 }
      );
    }

    // Check if review already exists for this appointment
    if (appointment.review) {
      return NextResponse.json(
        { error: "Você já avaliou este agendamento." },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: {
        tenantId: tenant.id,
        clientId: appointment.clientId,
        appointmentId,
        phoneE164,
        clientName: clientName.trim(),
        rating,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json({ id: review.id }, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation (already reviewed)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Você já avaliou este agendamento." },
        { status: 409 }
      );
    }
    console.error("Erro em POST /api/public/[slug]/reviews:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
