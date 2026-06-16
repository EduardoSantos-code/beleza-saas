import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const reservations = await prisma.productReservation.findMany({
      where: {
        tenantId: membership.tenantId,
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

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("[ADMIN_RESERVATIONS_GET]", error);
    return NextResponse.json(
      { error: "Erro interno ao listar reservas." },
      { status: 500 }
    );
  }
}
