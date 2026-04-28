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
    console.error("Erro ao atualizar profissional:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// EXCLUIR (Transformado em Soft Delete)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { id } = await params;
    
    // Soft Delete: Em vez de apagar do banco, apenas desativamos.
    // Isso mantém todo o histórico de agendamentos e financeiro intacto!
    await prisma.professional.update({ 
      where: { id },
      data: { active: false } // O pulo do gato!
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao tentar excluir (desativar) profissional:", error);
    return NextResponse.json({ error: "Erro interno ao desativar o profissional." }, { status: 500 });
  }
}