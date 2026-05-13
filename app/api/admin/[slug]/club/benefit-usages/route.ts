import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscriptionId");
    const clientId = searchParams.get("clientId");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const limit = Math.min(Math.max(limitParam, 1), 100);

    const where: { tenantId: string; subscriptionId?: string; clientId?: string } = {
      tenantId: tenant.id,
    };

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const usages = await prisma.clubBenefitUsage.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phoneE164: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
        appointment: {
          select: {
            id: true,
            status: true,
            startAt: true,
          },
        },
      },
    });

    const formattedUsages = usages.map((usage) => ({
      id: usage.id,
      periodKey: usage.periodKey,
      benefitType: usage.benefitType,
      createdAt: usage.createdAt,
      client: usage.client,
      service: usage.service,
      plan: usage.plan,
      appointment: usage.appointment
        ? {
            id: usage.appointment.id,
            status: usage.appointment.status,
            startsAt: usage.appointment.startAt,
          }
        : null,
    }));

    return NextResponse.json({
      benefitUsages: formattedUsages,
    });
  } catch (error) {
    console.error("[CLUB_BENEFIT_USAGES_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}