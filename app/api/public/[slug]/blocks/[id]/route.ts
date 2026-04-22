import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const block = await prisma.scheduleBlock.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!block) {
      return NextResponse.json(
        { error: "Bloqueio não encontrado" },
        { status: 404 }
      );
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        tenantId: block.tenantId,
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
    }

    await prisma.scheduleBlock.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro em DELETE /api/admin/blocks/[id]:", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir bloqueio" },
      { status: 500 }
    );
  }
}