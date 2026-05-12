import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; subscriptionId: string }> }
) {
  try {
    const { slug, subscriptionId } = await params;

    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status === "CANCELED") {
      return NextResponse.json({ ok: true, subscription });
    }

    const updatedSubscription = await prisma.clubSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
      include: {
        client: true,
        plan: true,
      },
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        canceledAt: updatedSubscription.canceledAt,
        client: {
          name: updatedSubscription.client.name,
          phoneE164: updatedSubscription.client.phoneE164,
        },
        plan: {
          name: updatedSubscription.plan.name,
        },
      },
    });
  } catch (error) {
    console.error("[CANCEL_SUBSCRIPTION_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}