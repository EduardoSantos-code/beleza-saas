import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";

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

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, description, price, stockQuantity, active, imageUrl } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (stockQuantity !== undefined) dataToUpdate.stockQuantity = Number(stockQuantity);
    if (active !== undefined) dataToUpdate.active = Boolean(active);
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl || null;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ ok: true, product: updatedProduct });
  } catch (error) {
    console.error("[ADMIN_PRODUCTS_PATCH]", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar produto." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    // Excluir fisicamente o produto
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ADMIN_PRODUCTS_DELETE]", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir produto." },
      { status: 500 }
    );
  }
}
