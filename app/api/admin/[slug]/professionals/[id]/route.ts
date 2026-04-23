import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ATUALIZAR (Telefone, Nome, Ativo/Inativo)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { id } = await params;
    const { name, phoneE164, active } = await req.json();

    const updated = await prisma.professional.update({
      where: { id },
      data: { 
        name, 
        phoneE164, 
        active: Boolean(active) 
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// EXCLUIR
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.professional.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir. Verifique se ele possui agendamentos." }, { status: 500 });
  }
}