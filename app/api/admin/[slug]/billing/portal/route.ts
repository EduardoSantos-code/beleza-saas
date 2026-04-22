import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL não definida" },
        { status: 500 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: membership.tenantId,
      },
      select: {
        id: true,
        slug: true,
        stripeCustomerId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    if (!tenant.stripeCustomerId) {
      return NextResponse.json(
        { error: "Cliente Stripe ainda não criado" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${appUrl}/admin/${tenant.slug}/billing`,
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/admin/[slug]/billing/portal:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno ao abrir portal" },
      { status: 500 }
    );
  }
}