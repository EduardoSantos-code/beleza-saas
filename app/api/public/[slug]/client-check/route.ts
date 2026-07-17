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
        { error: "Telefone não informado." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    const client = await prisma.client.findUnique({
      where: {
        tenantId_phoneE164: {
          tenantId: tenant.id,
          phoneE164: phoneE164.trim(),
        },
      },
      select: {
        name: true,
      },
    });

    if (!client) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, name: client.name });
  } catch (error) {
    console.error("Erro ao verificar cliente:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
