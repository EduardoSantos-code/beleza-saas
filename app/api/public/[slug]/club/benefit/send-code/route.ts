import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import crypto from "crypto";
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

    const { phoneE164 } = (body ?? {}) as {
      phoneE164?: string;
    };

    const phoneRegex = /^\+55\d{11}$/;

    if (!phoneE164 || !phoneRegex.test(phoneE164)) {
      return NextResponse.json(
        { error: "Telefone inválido." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        clubEnabled: true,
        subscriptionStatus: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    if (!tenant.clubEnabled) {
      return NextResponse.json(
        { error: "Clube indisponível." },
        { status: 400 }
      );
    }

    if (tenant.subscriptionStatus === "CANCELED") {
      return NextResponse.json(
        { error: "Estabelecimento indisponível no momento." },
        { status: 403 }
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
      select: {
        id: true,
        currentPeriodEnd: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const subscription = pickUsableActiveSubscription(activeSubscriptions);

    if (!subscription) {
      console.warn(`[CLUB_USE_BENEFIT_SEND_CODE][${requestId}] no usable subscription`, {
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

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const purpose = ClientPhoneVerificationPurpose.CLUB_USE_BENEFIT;

    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? "dev-only-client-otp-secret"
        : "");

    if (!secret) {
      console.error(
        `[CLUB_USE_BENEFIT_SEND_CODE][${requestId}] missing otp secret`
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

    await prisma.clientPhoneVerification.updateMany({
      where: {
        tenantId: tenant.id,
        phoneE164,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.clientPhoneVerification.create({
      data: {
        tenantId: tenant.id,
        phoneE164,
        purpose,
        codeHash,
        expiresAt,
      },
    });

    const message = `Seu código para usar o benefício do clube é: ${code}. Ele expira em 10 minutos.`;

    try {
      const waResult = await sendTenantWhatsAppMessage({
        tenantId: tenant.id,
        to: phoneE164,
        text: message,
      });

      if (!waResult.success) {
        console.error(
          `[CLUB_USE_BENEFIT_SEND_CODE][${requestId}] whatsapp failure`,
          waResult.reason,
          waResult.data
        );

        return NextResponse.json(
          { error: "Erro ao enviar código via WhatsApp." },
          { status: waResult.status || 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        expiresInMinutes: 10,
      });
    } catch (error) {
      console.error(
        `[CLUB_USE_BENEFIT_SEND_CODE][${requestId}] whatsapp exception`,
        error
      );

      return NextResponse.json(
        { error: "Erro ao enviar código via WhatsApp." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`[CLUB_USE_BENEFIT_SEND_CODE][${requestId}] unhandled`, error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
