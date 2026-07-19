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

    const photos = await prisma.galleryPhoto.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        imageUrl: true,
        caption: true,
      },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Erro em GET /api/public/[slug]/gallery:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
