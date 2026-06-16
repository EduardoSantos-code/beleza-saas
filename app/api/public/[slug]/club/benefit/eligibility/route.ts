import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import {
  ClientPhoneVerificationPurpose,
  ClubBenefitType,
  ClubSubscriptionStatus,
} from "@prisma/client";

function getBenefitPeriodKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

function isSubscriptionUsableNow(
  currentPeriodEnd: Date | null,
  now = new Date()
) {
  if (!currentPeriodEnd) return true;
  return endOfUtcDay(currentPeriodEnd) >= now;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("serviceId");
    const dateParam = searchParams.get("date");

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, clubEnabled: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.clubEnabled) {
      return NextResponse.json({
        ok: true,
        hasActiveMembership: false,
      });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("club_benefit_session");

    if (!sessionCookie) {
      return NextResponse.json({
        ok: true,
        hasActiveMembership: false,
      });
    }

    const secret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? "dev-only-client-session-secret"
        : "");

    if (!secret) {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    let payload: any;

    try {
      const encodedSecret = new TextEncoder().encode(secret);
      const { payload: decoded } = await jwtVerify(
        sessionCookie.value,
        encodedSecret
      );
      payload = decoded;
    } catch {
      return NextResponse.json({
        ok: true,
        hasActiveMembership: false,
      });
    }

    const phoneRegex = /^\+55\d{11}$/;

    const isValidSession =
      payload?.purpose === ClientPhoneVerificationPurpose.CLUB_USE_BENEFIT &&
      payload?.tenantId === tenant.id &&
      payload?.slug === tenant.slug &&
      typeof payload?.phoneE164 === "string" &&
      phoneRegex.test(payload.phoneE164) &&
      typeof payload?.subscriptionId === "string";

    if (!isValidSession) {
      return NextResponse.json({
        ok: true,
        hasActiveMembership: false,
      });
    }

    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        id: payload.subscriptionId,
        tenantId: tenant.id,
        status: ClubSubscriptionStatus.ACTIVE,
      },
      include: {
        client: true,
        plan: true,
      },
    });

    if (!subscription || !isSubscriptionUsableNow(subscription.currentPeriodEnd)) {
      return NextResponse.json({
        ok: true,
        hasActiveMembership: false,
      });
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId: tenant.id,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    let referenceDate = new Date();

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      referenceDate = new Date(`${dateParam}T12:00:00.000Z`);
    }

    const plan = subscription.plan;

    const hasIncludedBenefitConfigured =
      plan.includedBenefitType === ClubBenefitType.FREE_SERVICE &&
      plan.includedServiceId === service.id &&
      plan.includedUsesPerPeriod !== 0;

    const membershipInfo = {
      subscriptionId: subscription.id,
      planName: plan.name,
      discountPercent: plan.discountPercent ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };

    if (!hasIncludedBenefitConfigured) {
      return NextResponse.json({
        ok: true,
        hasActiveMembership: true,
        membership: membershipInfo,
        includedBenefit: {
          eligible: false,
          configured: false,
          available: false,
          usedCount: 0,
          totalAllowed: 0,
        },
      });
    }

    const periodKey = getBenefitPeriodKey(referenceDate);

    const usedCount = await prisma.clubBenefitUsage.count({
      where: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        serviceId: service.id,
        periodKey,
        benefitType: ClubBenefitType.FREE_SERVICE,
      },
    });

    const available = plan.includedUsesPerPeriod === -1 || usedCount < plan.includedUsesPerPeriod;

    return NextResponse.json({
      ok: true,
      hasActiveMembership: true,
      membership: membershipInfo,
      includedBenefit: {
        configured: true,
        eligible: true,
        available,
        usedCount,
        totalAllowed: plan.includedUsesPerPeriod,
      },
    });
  } catch (error) {
    console.error("[CLUB_BENEFIT_ELIGIBILITY_ERROR]", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        ok: false,
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
