import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { ClientPhoneVerificationPurpose } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { phoneE164 } = await req.json();

    // 1. Validar phoneE164
    if (!phoneE164 || !/^\+55\d{11}$/.test(phoneE164)) {
      return NextResponse.json(
        { error: "Telefone inválido. Use o formato +5511999999999" },
        { status: 400 }
      );
    }

    // 2. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, clubEnabled: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    // 3. Verificar se clube está ativo
    if (!tenant.clubEnabled) {
      return NextResponse.json({ error: "Clube indisponível." }, { status: 400 });
    }

    // 4. Buscar Client
    const client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164: phoneE164,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Nenhuma assinatura encontrada para este WhatsApp." },
        { status: 404 }
      );
    }

    // 5. Verificar se existe ClubSubscription
    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        clientId: client.id,
        tenantId: tenant.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Nenhuma assinatura encontrada para este WhatsApp." },
        { status: 404 }
      );
    }

    // 6. Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 7. Criar hash SHA-256
    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-otp-secret";

    const purpose = ClientPhoneVerificationPurpose.CLUB_PORTAL;
    const codeHash = crypto
      .createHmac("sha256", secret)
      .update(`${phoneE164}${code}${purpose}`)
      .digest("hex");

    // 8. Marcar códigos antigos como usados
    await prisma.clientPhoneVerification.updateMany({
      where: {
        phoneE164,
        purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // 9. Criar novo registro de verificação
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    await prisma.clientPhoneVerification.create({
      data: {
        tenantId: tenant.id,
        phoneE164,
        purpose,
        codeHash,
        expiresAt,
      },
    });

    // 10. Enviar WhatsApp
    const message = `Seu código para acessar sua assinatura do clube é: ${code}. Ele expira em 10 minutos.`;
    const { success } = await sendWhatsAppMessage(phoneE164, message,);

    if (!success && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Erro ao enviar WhatsApp" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, expiresInMinutes: 10, ...(process.env.NODE_ENV !== "production" && { devCode: code }) });
  } catch (error) {
    console.error("[CLUB_PORTAL_SEND_CODE]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}