import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

// ATUALIZAR (Telefone, Nome, Ativo/Inativo)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const { name, phoneE164, active, commissionRate, imageUrl } = await req.json();

    const membership = await getCurrentMembershipBySlug(slug);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER" && membership.role !== "MASTER")) {
      return NextResponse.json({ error: "Acesso negado: permissão insuficiente" }, { status: 403 });
    }

    if (active === true) {
      const activeCount = await prisma.professional.count({
        where: {
          tenantId: membership.tenantId,
          active: true,
          NOT: { id },
        },
      });

      const planTier = membership.tenant.planTier || "PRO";
      const limit = planTier === "BASICO" ? 1 : planTier === "ESSENCIAL" ? 3 : 5;

      if (activeCount >= limit) {
        const planName = planTier === "BASICO" ? "Trato Básico" : planTier === "ESSENCIAL" ? "Trato Essencial" : "Trato Pro";
        return NextResponse.json(
          { error: `Seu plano (${planName}) permite no máximo ${limit} barbeiro(s) ativo(s). Faça um upgrade para adicionar mais.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.professional.update({
      where: { id },
      data: { 
        name, 
        phoneE164, 
        active: active !== undefined ? Boolean(active) : undefined,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
        imageUrl,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// EXCLUIR (Deleção Física do Banco de Dados)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    const membership = await getCurrentMembershipBySlug(slug);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER" && membership.role !== "MASTER")) {
      return NextResponse.json({ error: "Acesso negado: permissão insuficiente" }, { status: 403 });
    }
    
    // Real Delete: Remove fisicamente do banco de dados (cascateando para horários, bloqueios e agendamentos)
    await prisma.professional.delete({ 
      where: { id }
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao tentar excluir profissional:", error);
    return NextResponse.json({ error: "Erro interno ao excluir o profissional." }, { status: 500 });
  }
}