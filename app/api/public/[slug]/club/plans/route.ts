import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        clubEnabled: true,
        clubPaymentProvider: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantData = {
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
    };

    if (!tenant.clubEnabled) {
      return NextResponse.json({
        enabled: false,
        tenant: tenantData,
        plans: [],
      });
    }

    const plans = await prisma.clubPlan.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      orderBy: {
        priceInCents: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        terms: true,
        priceInCents: true,
        billingCycle: true,
        discountPercent: true,
      },
    });

    return NextResponse.json({
      enabled: true,
      paymentProvider: tenant.clubPaymentProvider,
      tenant: tenantData,
      plans,
    });
  } catch (error) {
    console.error("Error fetching club plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}