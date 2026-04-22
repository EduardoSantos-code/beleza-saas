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

    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID_MONTHLY não definida" },
        { status: 500 }
      );
    }

    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL não definida" },
        { status: 500 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      include: {
        memberships: {
          include: {
            user: true,
          },
          where: {
            role: "OWNER",
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    let stripeCustomerId = tenant.stripeCustomerId;

    if (!stripeCustomerId) {
      const owner = tenant.memberships[0]?.user;

      const customer = await stripe.customers.create({
        name: tenant.name,
        email: owner?.email || undefined,
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          stripeCustomerId,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/admin/${tenant.slug}/billing?success=true`,
      cancel_url: `${appUrl}/admin/${tenant.slug}/billing?canceled=true`,
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/admin/[slug]/billing/checkout:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno ao criar checkout" },
      { status: 500 }
    );
  }
}