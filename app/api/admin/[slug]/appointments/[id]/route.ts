import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        tenant: { select: { name: true, slug: true } },
        service: { select: { name: true, priceCents: true, durationMin: true } },
        professional: { select: { name: true } },
        client: { select: { name: true } },
      },
    });

    // Se não achou o agendamento
    if (!appointment) {
      console.error(`❌ Agendamento ${id} não encontrado no banco.`);
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    // Comparação de slug ignorando maiúsculas/minúsculas
    if (appointment.tenant.slug.toLowerCase() !== slug.toLowerCase()) {
      console.error(`❌ Slug incompatível: ${appointment.tenant.slug} vs ${slug}`);
      return NextResponse.json({ error: "Slug inválido" }, { status: 403 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("❌ Erro na API de detalhes:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}