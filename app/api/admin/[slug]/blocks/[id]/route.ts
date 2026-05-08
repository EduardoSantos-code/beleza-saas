import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // 1. Verificação de segurança (Impede que deletem bloqueios de outros salões)
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Busca o bloqueio para ter certeza que ele pertence a este tenant
    const block = await prisma.scheduleBlock.findFirst({
      where: {
        id: id,
        tenantId: membership.tenantId,
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Bloqueio não encontrado" }, { status: 404 });
    }

    // 3. Deleta o bloqueio
    await prisma.scheduleBlock.delete({
      where: { id: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao deletar bloqueio:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir bloqueio" },
      { status: 500 }
    );
  }
}