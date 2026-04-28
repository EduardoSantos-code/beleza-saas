import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        tenant: { slug },
      },
      include: {
        service: true,
        professional: true,
        tenant: {
          select: { name: true, primaryColor: true, logoUrl: true },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Erro ao buscar agendamento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    const body = await req.json();
    const novoStatus = body.status;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        tenant: { slug },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    if (appointment.status === "CANCELED" || appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Este agendamento não pode mais ser cancelado." },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: novoStatus },
    });

    return NextResponse.json({ ok: true, appointment: updated });
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}