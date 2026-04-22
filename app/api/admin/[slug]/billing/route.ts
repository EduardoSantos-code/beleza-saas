import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { isTenantBillingActive } from "@/lib/billing";
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

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: membership.tenantId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCancelAtPeriodEnd: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenant,
      billingActive: isTenantBillingActive(tenant),
    });
  } catch (error: any) {
    console.error("Erro em GET /api/admin/[slug]/billing:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao carregar assinatura",
      },
      { status: 500 }
    );
  }
}