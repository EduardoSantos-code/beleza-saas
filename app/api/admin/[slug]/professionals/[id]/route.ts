import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateProfessionalSchema = z.object({
  name: z.string().min(2).max(120),
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
    const parsed = UpdateProfessionalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const professional = await prisma.professional.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Profissional não encontrada" },
        { status: 404 }
      );
    }

    const updated = await prisma.professional.update({
      where: { id },
      data: {
        name: parsed.data.name,
        active: parsed.data.active,
      },
    });

    return NextResponse.json({ ok: true, professional: updated });
  } catch (error) {
    console.error("Erro em PATCH /api/admin/[slug]/professionals/[id]:", error);

    return NextResponse.json(
      { error: "Erro interno ao atualizar profissional" },
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

    const professional = await prisma.professional.findFirst({
      where: {
        id,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    if (!professional) {
      return NextResponse.json(
        { error: "Profissional não encontrada" },
        { status: 404 }
      );
    }

    const linkedAppointments = await prisma.appointment.count({
      where: {
        professionalId: id,
      },
    });

    if (linkedAppointments > 0) {
      return NextResponse.json(
        {
          error:
            "Esta profissional já possui agendamentos vinculados. Desative-a em vez de excluir.",
        },
        { status: 400 }
      );
    }

    await prisma.professional.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro em DELETE /api/admin/[slug]/professionals/[id]:", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir profissional" },
      { status: 500 }
    );
  }
}