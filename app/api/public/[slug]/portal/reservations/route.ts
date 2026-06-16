import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getClientSession(slug);

    if (!session) {
      return NextResponse.json(
        { error: "Sessão expirada. Identifique-se novamente." },
        { status: 401 }
      );
    }

    const reservations = await prisma.productReservation.findMany({
      where: {
        tenantId: session.tenantId,
        clientId: session.clientId,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("[PORTAL_RESERVATIONS_GET]", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar reservas de produtos." },
      { status: 500 }
    );
  }
}
