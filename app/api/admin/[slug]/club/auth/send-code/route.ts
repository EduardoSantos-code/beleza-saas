import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendWhatsAppText } from "@/lib/whatsapp";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { phoneE164, planId } = body;

    // 2. Validar
    const phoneRegex = /^\+55\d{11}$/;
    if (!phoneE164 || !phoneRegex.test(phoneE164)) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }
    if (!planId) {
      return NextResponse.json({ error: "Plano não informado" }, { status: 400 });
    }

    // 3. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    if (!tenant.clubEnabled) {
      return NextResponse.json({ error: "Clube indisponível" }, { status: 400 });
    }

    // 4. Buscar ClubPlan
    const plan = await prisma.clubPlan.findFirst({
      where: {
        id: planId,
        tenantId: tenant.id,
        isActive: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    // 5. Gerar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. Criar hash
    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-otp-secret";

    const codeHash = crypto
      .createHash("sha256")
      .update(`${phoneE164}${code}${secret}`)
      .digest("hex");

    // 7. Marcar códigos antigos como usados
    await prisma.clientPhoneVerification.updateMany({
      where: {
        phoneE164,
        purpose: "CLUB_SUBSCRIBE",
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 8. Criar ClientPhoneVerification
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.clientPhoneVerification.create({
      data: {
        tenantId: tenant.id,
        phoneE164,
        codeHash,
        purpose: "CLUB_SUBSCRIBE",
        expiresAt,
      },
    });

    // 9. Enviar WhatsApp
    const message = `Seu código para assinar o clube é: ${code}. Ele expira em 10 minutos.`;
    let whatsappSent = false;
    try {
      await sendWhatsAppText(phoneE164, message);
      whatsappSent = true;
    } catch (err) {
      console.error("Erro ao enviar WhatsApp:", err);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Erro ao enviar código" }, { status: 500 });
      }
    }

    // 11. Retornar
    return NextResponse.json({
      ok: true,
      expiresInMinutes: 10,
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("[CLUB_SEND_CODE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}