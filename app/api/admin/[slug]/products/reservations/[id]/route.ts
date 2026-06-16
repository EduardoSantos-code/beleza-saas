import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { ProductReservationStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const reservation = await prisma.productReservation.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
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

    const body = await req.json();
    const { status } = body as { status?: ProductReservationStatus };

    if (!status || !Object.values(ProductReservationStatus).includes(status)) {
      return NextResponse.json(
        { error: "Status inválido fornecido." },
        { status: 400 }
      );
    }

    const oldStatus = reservation.status;
    const newStatus = status;

    if (oldStatus === newStatus) {
      return NextResponse.json({ ok: true, reservation });
    }

    // Executa a transação para coordenar o estoque
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Se passou de CANCELED para outra coisa, deduzimos estoque se houver disponível
      if (oldStatus === "CANCELED" && newStatus !== "CANCELED") {
        for (const item of reservation.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || !product.active) {
            throw new Error(`O produto "${product?.name || item.productId}" não está mais disponível.`);
          }

          if (product.stockQuantity < item.quantity) {
            throw new Error(`Estoque insuficiente para o produto "${product.name}". Estoque atual: ${product.stockQuantity}`);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // 2. Se passou de outra coisa para CANCELED, devolvemos estoque
      if (oldStatus !== "CANCELED" && newStatus === "CANCELED") {
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
      }

      // 3. Atualizar a reserva
      const updatedRes = await tx.productReservation.update({
        where: { id },
        data: {
          status: newStatus,
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
      });

      return updatedRes;
    });

    return NextResponse.json({ ok: true, reservation: updated });
  } catch (error: any) {
    console.error("[ADMIN_RESERVATIONS_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao atualizar reserva." },
      { status: 500 }
    );
  }
}
