import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const session = await getClientSession(slug);

    if (!session) {
      return NextResponse.json(
        { error: "Sessão expirada. Identifique-se novamente." },
        { status: 401 }
      );
    }

    // 1. Buscar a reserva garantindo que pertence ao cliente e estabelecimento do portal
    const reservation = await prisma.productReservation.findFirst({
      where: {
        id,
        clientId: session.clientId,
        tenantId: session.tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva não encontrada." },
        { status: 404 }
      );
    }

    // 2. Apenas reservas PENDENTES ou CONFIRMADAS podem ser canceladas pelo cliente
    if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Esta reserva não pode mais ser cancelada." },
        { status: 400 }
      );
    }

    // 3. Executa a transação para atualizar o status e devolver o estoque
    await prisma.$transaction(async (tx) => {
      // Devolve o estoque de cada item da reserva
      for (const item of reservation.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Atualiza o status da reserva para CANCELED
      await tx.productReservation.update({
        where: { id },
        data: {
          status: "CANCELED",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PORTAL_RESERVATIONS_CANCEL_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno ao cancelar a reserva." },
      { status: 500 }
    );
  }
}
