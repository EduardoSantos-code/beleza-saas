import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";
import { ClientPhoneVerificationPurpose } from "@prisma/client";

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
      return NextResponse.json(
        { error: "Body inválido." },
        { status: 400 }
      );
    }

    const { phoneE164, code } = (body ?? {}) as {
      phoneE164?: string;
      code?: string;
    };

    console.log(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] start`, {
      slug,
      phoneE164,
    });

    if (!phoneE164 || !/^\+55\d{11}$/.test(phoneE164)) {
      return NextResponse.json(
        { error: "Telefone inválido." },
        { status: 400 }
      );
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Código inválido. Devem ser 6 dígitos." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      console.warn(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] tenant not found`, {
        slug,
      });

      return NextResponse.json(
        { error: "Tenant não encontrado." },
        { status: 404 }
      );
    }

    const purpose = ClientPhoneVerificationPurpose.CLUB_PORTAL;

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
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!verification) {
      console.warn(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] verification not found`, {
        tenantId: tenant.id,
        phoneE164,
      });

      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    const otpSecret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? "dev-only-client-otp-secret"
        : "");

    if (!otpSecret) {
      console.error(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] missing otp secret`);
      return NextResponse.json(
        { error: "Erro de configuração de segurança." },
        { status: 500 }
      );
    }

    const expectedHash = crypto
      .createHmac("sha256", otpSecret)
      .update(`${phoneE164}${code}${purpose}`)
      .digest("hex");

    if (verification.codeHash !== expectedHash) {
      console.warn(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] invalid code hash`, {
        tenantId: tenant.id,
        phoneE164,
      });

      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
      },
      select: {
        id: true,
      },
    });

    if (!client) {
      console.warn(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] client not found`, {
        tenantId: tenant.id,
        phoneE164,
      });

      return NextResponse.json(
        { error: "Cliente não encontrado." },
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
        `[CLUB_PORTAL_VERIFY_CODE][${requestId}] missing session secret`
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
        purpose,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30m")
        .sign(new TextEncoder().encode(sessionSecret));
    } catch (error) {
      console.error(
        `[CLUB_PORTAL_VERIFY_CODE][${requestId}] jwt sign error`,
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
      console.warn(
        `[CLUB_PORTAL_VERIFY_CODE][${requestId}] verification already used`,
        {
          verificationId: verification.id,
        }
      );

      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      verified: true,
    });

    response.cookies.set("club_portal_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });

    console.log(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] success`, {
      tenantId: tenant.id,
      clientId: client.id,
      phoneE164,
    });

    return response;
  } catch (error) {
    console.error(`[CLUB_PORTAL_VERIFY_CODE][${requestId}] unhandled`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
