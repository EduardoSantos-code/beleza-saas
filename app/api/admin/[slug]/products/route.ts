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

    const products = await prisma.product.findMany({
      where: {
        tenantId: membership.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[ADMIN_PRODUCTS_GET]", error);
    return NextResponse.json(
      { error: "Erro interno ao listar produtos." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, price, stockQuantity, active, imageUrl } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome do produto inválido." },
        { status: 400 }
      );
    }

    const parsedPrice = typeof price === "number" ? price : 0;
    const parsedStock = typeof stockQuantity === "number" ? stockQuantity : 0;

    const newProduct = await prisma.product.create({
      data: {
        tenantId: membership.tenantId,
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parsedPrice,
        stockQuantity: parsedStock,
        active: active !== undefined ? Boolean(active) : true,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({ ok: true, product: newProduct });
  } catch (error) {
    console.error("[ADMIN_PRODUCTS_POST]", error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar produto." },
      { status: 500 }
    );
  }
}
