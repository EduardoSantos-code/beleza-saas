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

    await prisma.tenant.update({
      where: { id: membership.tenantId },
      data: { cpfCnpj },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar dados" }, { status: 500 });
  }
}