import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Pegamos o status que o seu front-end enviou (COMPLETED ou CANCELED)
    const body = await req.json();
    const { status } = body;

    // 2. Atualizamos com o status dinâmico
    const updated = await prisma.appointment.update({
      where: { id },
      data: { 
        status: status // Agora ele vai salvar o que o botão mandou!
      },
    });

    return NextResponse.json({ ok: true, appointment: updated });
  } catch (error) {
    console.error("Erro na API Admin:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}