import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateServiceSchema = z.object({
  name: z.string().min(2).max(120),
  durationMin: z.number().int().min(5).max(480),
  price: z.number().int().min(0).max(100000000),
  active: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        name: parsed.data.name,
        durationMin: parsed.data.durationMin,
        price: parsed.data.price,
        active: parsed.data.active,
      },
    });

    return NextResponse.json({ ok: true, service: updated });
  } catch (error) {
    console.error("Erro em PATCH /api/admin/[slug]/services/[id]:", error);

    return NextResponse.json(
      { error: "Erro interno ao atualizar serviço" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        serviceId: id,
      },
    });

    if (linkedAppointments > 0) {
      return NextResponse.json(
        {
          error:
            "Este serviço já possui agendamentos vinculados. Desative-o em vez de excluir.",
        },
        { status: 400 }
      );
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro em DELETE /api/admin/[slug]/services/[id]:", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir serviço" },
      { status: 500 }
    );
  }
}