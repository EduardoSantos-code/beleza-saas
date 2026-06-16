import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, planStatus: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[PUBLIC_PRODUCTS_GET]", error);
    return NextResponse.json(
      { error: "Erro interno ao listar produtos." },
      { status: 500 }
    );
  }
}
