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
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }

    const [services, professionals] = await Promise.all([
      prisma.service.findMany({
        where: { tenantId: tenant.id, active: true },
        select: {
          id: true,
          name: true,
          durationMin: true,
          priceCents: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.professional.findMany({
        where: { tenantId: tenant.id, active: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      tenant,
      services,
      professionals,
    });
  } catch (error) {
    console.error("Erro em /api/public/[slug]/catalog:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar catálogo" },
      { status: 500 }
    );
  }
}