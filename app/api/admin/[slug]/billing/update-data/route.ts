import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { cpfCnpj } = await req.json();
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: { cpfCnpj: true },
    });

    if (tenant?.cpfCnpj) {
      return NextResponse.json(
        { error: "O CPF/CNPJ já foi cadastrado e não pode ser alterado." },
        { status: 400 }
      );
    }

    await prisma.tenant.update({
      where: { id: membership.tenantId },
      data: { cpfCnpj },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar dados" }, { status: 500 });
  }
}