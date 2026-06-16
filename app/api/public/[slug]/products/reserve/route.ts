import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function POST(
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

    const body = await req.json();
    const { items } = body as { items?: { productId: string; quantity: number }[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto selecionado para reserva." },
        { status: 400 }
      );
    }

    // Validar quantidades
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Quantidade inválida para os produtos selecionados." },
          { status: 400 }
        );
      }
    }

    // Iniciar transação para garantir atomicidade do estoque
    const reservation = await prisma.$transaction(async (tx) => {
      const dbItems = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.tenantId !== session.tenantId || !product.active) {
          throw new Error(`Produto não encontrado ou indisponível.`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto "${product.name}". Estoque atual: ${product.stockQuantity}`);
        }

        // Deduz do estoque
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        dbItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtReservation: product.price,
        });
      }

      // Criar a reserva de produtos
      const newReservation = await tx.productReservation.create({
        data: {
          tenantId: session.tenantId,
          clientId: session.clientId,
          status: "PENDING",
          items: {
            create: dbItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return newReservation;
    });

    return NextResponse.json({ ok: true, reservation });
  } catch (error: any) {
    console.error("[PORTAL_RESERVE_POST_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar reserva." },
      { status: 500 }
    );
  }
}
