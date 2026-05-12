import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireTenantAccess(slug);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const where: any = {
      tenantId: tenant.id,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (q) {
      where.client = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phoneE164: { contains: q } },
        ],
      };
    }

    const subscriptions = await prisma.clubSubscription.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phoneE164: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            priceInCents: true,
            billingCycle: true,
            discountPercent: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const subscribers = subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      provider: sub.provider,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      createdAt: sub.createdAt,
      canceledAt: sub.canceledAt,
      client: {
        id: sub.client.id,
        name: sub.client.name,
        phoneE164: sub.client.phoneE164,
      },
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        priceInCents: sub.plan.priceInCents,
        billingCycle: sub.plan.billingCycle,
        discountPercent: sub.plan.discountPercent,
      },
    }));

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("[CLUB_SUBSCRIBERS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

interface PrismaWhere {
  tenantId: string;
  status?: string;
  client?: { OR: Array<{ name?: { contains: string; mode: string }; phoneE164?: { contains: string } }> };
}