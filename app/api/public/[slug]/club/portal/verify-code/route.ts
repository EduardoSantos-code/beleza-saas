import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";
import { ClientPhoneVerificationPurpose } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { phoneE164, code } = await req.json();

    // 1. Validar phoneE164
    if (!phoneE164 || !/^\+55\d{11}$/.test(phoneE164)) {
      return NextResponse.json(
        { error: "Telefone inválido." },
        { status: 400 }
      );
    }

    // 2. Validar code
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Código inválido. Devem ser 6 dígitos." },
        { status: 400 }
      );
    }

    // 3. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    const purpose = ClientPhoneVerificationPurpose.CLUB_PORTAL;

    // 4. Buscar código mais recente
    const verification = await prisma.clientPhoneVerification.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    // 5. Recalcular hash
    const otpSecret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-otp-secret";

    const expectedHash = crypto
      .createHmac("sha256", otpSecret)
      .update(`${phoneE164}${code}${purpose}`)
      .digest("hex");

    if (verification.codeHash !== expectedHash) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    // 7. Marcar usedAt
    await prisma.clientPhoneVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // 8. Buscar Client
    const client = await prisma.client.findFirst({
      where: { tenantId: tenant.id, phoneE164 },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    // 9. Criar JWT
    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    if (process.env.NODE_ENV === "production" && sessionSecret === "dev-only-client-session-secret") {
      return NextResponse.json({ error: "Erro de configuração de segurança" }, { status: 500 });
    }

    const token = await new SignJWT({
      tenantId: tenant.id,
      slug: tenant.slug,
      phoneE164,
      clientId: client.id,
      purpose: "CLUB_PORTAL",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(new TextEncoder().encode(sessionSecret));

    // 12. Setar cookie
    const response = NextResponse.json({ ok: true, verified: true });
    response.cookies.set("club_portal_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });

    return response;
  } catch (error) {
    console.error("[CLUB_PORTAL_VERIFY_CODE]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}