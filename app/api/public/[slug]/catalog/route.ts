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
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        heroImageUrl: true,
        primaryColor: true,
        publicDescription: true,
        publicPhone: true,
        address: true,
        instagram: true,
        clubEnabled: true,
        clubPaymentProvider: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }

    const [services, professionals, activeClubPlansCount, reviewStats, totalServicesRendered] = await Promise.all([
      prisma.service.findMany({
        where: { tenantId: tenant.id, active: true },
        select: {
          id: true,
          name: true,
          durationMin: true,
          price: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.professional.findMany({
        where: { tenantId: tenant.id, active: true },
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.clubPlan.count({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
      }),
      prisma.review.aggregate({
        where: { tenantId: tenant.id },
        _avg: { rating: true },
        _count: { id: true },
      }),
      prisma.appointment.count({
        where: {
          tenantId: tenant.id,
          status: "COMPLETED",
        },
      }),
    ]);

    return NextResponse.json({
      tenant,
      services,
      professionals,
      club: {
        enabled: tenant.clubEnabled && activeClubPlansCount > 0,
        plansCount: activeClubPlansCount,
        paymentProvider: tenant.clubPaymentProvider,
      },
      stats: {
        averageRating: reviewStats._avg.rating
          ? Math.round(reviewStats._avg.rating * 10) / 10
          : 0,
        totalReviews: reviewStats._count.id,
        totalServicesRendered,
      },
    });
  } catch (error) {
    console.error("Erro em /api/public/[slug]/catalog:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar catálogo" },
      { status: 500 }
    );
  }
}