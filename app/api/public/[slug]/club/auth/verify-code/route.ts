import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { phoneE164, code } = body;

    // 2. Validar
    const phoneRegex = /^\+55\d{11}$/;
    const codeRegex = /^\d{6}$/;

    if (!phoneE164 || !phoneRegex.test(phoneE164)) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }
    if (!code || !codeRegex.test(code)) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    // 3. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    // 4. Buscar o código mais recente
    const verification = await prisma.clientPhoneVerification.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
        purpose: "CLUB_SUBSCRIBE",
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

    // 6. Gerar o hash novamente
    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-otp-secret";

    const codeHash = crypto
      .createHash("sha256")
      .update(`${phoneE164}${code}${secret}`)
      .digest("hex");

    // 7. Comparar
    if (codeHash !== verification.codeHash) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    // 8. Marcar como usado
    await prisma.clientPhoneVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // 9. Criar JWT
    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    if (process.env.NODE_ENV === "production" && sessionSecret === "dev-only-client-session-secret") {
      console.error("Missing CLIENT_SESSION_SECRET in production");
      return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }

    const token = await new SignJWT({
      tenantId: tenant.id,
      slug: tenant.slug,
      phoneE164,
      purpose: "CLUB_SUBSCRIBE",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(new TextEncoder().encode(sessionSecret));

    // 10. Setar cookie e retornar
    const response = NextResponse.json({
      ok: true,
      verified: true,
    });

    response.cookies.set("club_client_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });

    return response;
  } catch (error) {
    console.error("[CLUB_VERIFY_CODE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}