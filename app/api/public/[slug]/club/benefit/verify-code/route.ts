import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";
import {
  ClientPhoneVerificationPurpose,
  ClubSubscriptionStatus,
} from "@prisma/client";

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

function pickUsableActiveSubscription<
  T extends {
    id: string;
    currentPeriodEnd: Date | null;
    createdAt: Date;
    updatedAt: Date;
    plan: {
      id: string;
      name: string;
      discountPercent: number | null;
    };
  }
>(subscriptions: T[], now = new Date()) {
  const usable = subscriptions.filter((sub) =>
    isSubscriptionUsableNow(sub.currentPeriodEnd, now)
  );

  usable.sort((a, b) => {
    const aEnd = a.currentPeriodEnd
      ? endOfUtcDay(a.currentPeriodEnd).getTime()
      : Number.MAX_SAFE_INTEGER;

    const bEnd = b.currentPeriodEnd
      ? endOfUtcDay(b.currentPeriodEnd).getTime()
      : Number.MAX_SAFE_INTEGER;

    if (bEnd !== aEnd) return bEnd - aEnd;

    const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (updatedDiff !== 0) return updatedDiff;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return usable[0] ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const { slug } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body inválido." }, { status: 400 });
    }

    const { phoneE164, code } = (body ?? {}) as {
      phoneE164?: string;
      code?: string;
    };

    const phoneRegex = /^\+55\d{11}$/;
    const codeRegex = /^\d{6}$/;

    if (!phoneE164 || !phoneRegex.test(phoneE164)) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    if (!code || !codeRegex.test(code)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const purpose = ClientPhoneVerificationPurpose.CLUB_USE_BENEFIT;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    const verification = await prisma.clientPhoneVerification.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        codeHash: true,
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? "dev-only-client-otp-secret"
        : "");

    if (!secret) {
      console.error(
        `[CLUB_BENEFIT_VERIFY_CODE][${requestId}] missing otp secret`
      );

      return NextResponse.json(
        { error: "Erro de configuração de segurança." },
        { status: 500 }
      );
    }

    const codeHash = crypto
      .createHash("sha256")
      .update(`${phoneE164}${code}${purpose}${secret}`)
      .digest("hex");

    if (codeHash !== verification.codeHash) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: { tenantId: tenant.id, phoneE164 },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    const activeSubscriptions = await prisma.clubSubscription.findMany({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        status: ClubSubscriptionStatus.ACTIVE,
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            discountPercent: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const subscription = pickUsableActiveSubscription(activeSubscriptions);

    if (!subscription) {
      console.warn(`[CLUB_BENEFIT_VERIFY_CODE][${requestId}] no usable subscription`, {
        tenantId: tenant.id,
        clientId: client.id,
        phoneE164,
        foundActiveCount: activeSubscriptions.length,
      });

      return NextResponse.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? "dev-only-client-session-secret"
        : "");

    if (!sessionSecret) {
      console.error(
        `[CLUB_BENEFIT_VERIFY_CODE][${requestId}] missing session secret`
      );

      return NextResponse.json(
        { error: "Erro de configuração de segurança." },
        { status: 500 }
      );
    }

    let token: string;

    try {
      token = await new SignJWT({
        tenantId: tenant.id,
        slug: tenant.slug,
        phoneE164,
        clientId: client.id,
        subscriptionId: subscription.id,
        purpose,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30m")
        .sign(new TextEncoder().encode(sessionSecret));
    } catch (error) {
      console.error(
        `[CLUB_BENEFIT_VERIFY_CODE][${requestId}] jwt sign error`,
        error
      );

      return NextResponse.json(
        { error: "Erro ao criar sessão." },
        { status: 500 }
      );
    }

    const markAsUsed = await prisma.clientPhoneVerification.updateMany({
      where: {
        id: verification.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (markAsUsed.count === 0) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      membership: {
        subscriptionId: subscription.id,
        planId: subscription.plan.id,
        planName: subscription.plan.name,
        discountPercent: subscription.plan.discountPercent,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });

    response.cookies.set("club_benefit_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });

    return response;
  } catch (error) {
    console.error(`[CLUB_BENEFIT_VERIFY_CODE][${crypto.randomUUID()}] unhandled`, error);

    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
