import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const reviews = await prisma.review.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientName: true,
        phoneE164: true,
        rating: true,
        comment: true,
        createdAt: true,
        appointment: {
          select: {
            service: { select: { name: true } },
            professional: { select: { name: true } },
          },
        },
      },
    });

    const avgResult = await prisma.review.aggregate({
      where: { tenantId: tenant.id },
      _avg: { rating: true },
    });

    return NextResponse.json({
      reviews,
      averageRating: avgResult._avg.rating
        ? Math.round(avgResult._avg.rating * 10) / 10
        : 0,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/reviews:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await requireTenantAccess(slug);

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("id");

    if (!reviewId) {
      return NextResponse.json({ error: "ID do review é obrigatório" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    // Verify review belongs to this tenant
    const review = await prisma.review.findFirst({
      where: { id: reviewId, tenantId: tenant.id },
    });

    if (!review) {
      return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
    }

    await prisma.review.delete({ where: { id: reviewId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro em DELETE /api/admin/[slug]/reviews:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
