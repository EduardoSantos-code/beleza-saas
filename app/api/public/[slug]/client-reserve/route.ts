import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { phoneE164, clientName, items } = body as {
      phoneE164?: string;
      clientName?: string;
      items?: { productId: string; quantity: number }[];
    };

    if (!phoneE164 || !clientName) {
      return NextResponse.json(
        { error: "Telefone e nome são obrigatórios para a reserva." },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto selecionado para reserva." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, planTier: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    if (tenant.planTier === "BASICO") {
      return NextResponse.json(
        { error: "Este estabelecimento não possui suporte a reserva de produtos no plano atual." },
        { status: 403 }
      );
    }

    let client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
      },
      select: { id: true },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          phoneE164,
          name: clientName.trim(),
        },
        select: { id: true },
      });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const dbItems = [];

      for (const item of items) {
        if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) {
          throw new Error("Quantidade inválida informada.");
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.tenantId !== tenant.id || !product.active) {
          throw new Error(`Produto não encontrado ou indisponível.`);
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

        dbItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtReservation: product.price,
        });
      }

      const newReservation = await tx.productReservation.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
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
    console.error("[CLIENT_RESERVE_POST_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar reserva." },
      { status: 500 }
    );
  }
}
