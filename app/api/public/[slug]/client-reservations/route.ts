import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const phoneE164 = searchParams.get("phoneE164");

    if (!phoneE164) {
      return NextResponse.json(
        { error: "phoneE164 é obrigatório" },
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

    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
      },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ reservations: [] });
    }

    const reservations = await prisma.productReservation.findMany({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
      },
      include: {
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
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("Erro em GET /api/public/[slug]/client-reservations:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
