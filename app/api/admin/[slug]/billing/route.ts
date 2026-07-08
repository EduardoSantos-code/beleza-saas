import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Primeiro buscamos o tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        planStatus: true,
        trialEndsAt: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
        cpfCnpj: true,
        planTier: true,
        planCycle: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    // SÓ DEPOIS de buscar o tenant é que podemos fazer cálculos ou verificações
    const isTrialing = tenant.planStatus === "TRIAL" && tenant.trialEndsAt && new Date() < new Date(tenant.trialEndsAt);
    const billingActive = tenant.planStatus === "ACTIVE" || isTrialing;

    return NextResponse.json({
      tenant,
      billingActive,
    });
  } catch (error: any) {
    console.error("Erro em GET /api/admin/[slug]/billing:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}