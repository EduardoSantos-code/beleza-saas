import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { phoneE164, code } = body;

    // 1 & 2. Validar
    const phoneRegex = /^\+55\d{11}$/;
    const codeRegex = /^\d{6}$/;

    if (!phoneE164 || !phoneRegex.test(phoneE164)) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }
    if (!code || !codeRegex.test(code)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const purpose = "CLUB_USE_BENEFIT";

    // 3. Buscar tenant por slug
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

    // 6. Se inválido, retornar 400
    if (!verification) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    // 5. Recalcular hash
    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-otp-secret";

    const codeHash = crypto
      .createHash("sha256")
      .update(`${phoneE164}${code}${purpose}${secret}`)
      .digest("hex");

    // 6. Validar comparação de hash
    if (codeHash !== verification.codeHash) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 }
      );
    }

    // 7. Marcar como usado
    await prisma.clientPhoneVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // 8. Buscar Client
    const client = await prisma.client.findFirst({
      where: { tenantId: tenant.id, phoneE164 },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    // 9. Buscar ClubSubscription ACTIVE
    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        clientId: client.id,
        tenantId: tenant.id,
        status: "ACTIVE",
        currentPeriodEnd: { gte: new Date() },
      },
      include: { plan: true },
    });

    // 10. Se não encontrar, retornar 404
    if (!subscription) {
      return NextResponse.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    // 11. Criar cookie HTTP-only
    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    const token = await new SignJWT({
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

    // 12. Retornar resposta
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
      maxAge: 60 * 30, // 30 minutos em segundos
    });

    return response;
  } catch (error) {
    console.error("[CLUB_BENEFIT_VERIFY_CODE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}