import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { phoneE164 } = await req.json();

    // 1. Validar phoneE164
    const phoneRegex = /^\+55\d{11}$/;
    if (!phoneE164 || !phoneRegex.test(phoneE164)) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    // 2. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, clubEnabled: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Estabelecimento não encontrado." }, { status: 404 });
    }

    // 3. Verificar se clube está ativo
    if (!tenant.clubEnabled) {
      return NextResponse.json({ error: "Clube indisponível." }, { status: 400 });
    }

    // 4. Buscar Cliente
    const client = await prisma.client.findFirst({
      where: { tenantId: tenant.id, phoneE164 },
    });

    if (!client) {
      return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada." }, { status: 404 });
    }

    // 5 & 6. Buscar Assinatura Ativa
    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        status: "ACTIVE",
        currentPeriodEnd: { gte: new Date() },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada." }, { status: 404 });
    }

    // 7. Gerar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const purpose = "CLUB_USE_BENEFIT";

    // 8. Hash SHA-256
    const secret = process.env.CLIENT_OTP_SECRET || 
                   process.env.JWT_SECRET || 
                   process.env.AUTH_SECRET || 
                   "dev-only-client-otp-secret";
    
    const codeHash = crypto
      .createHash("sha256")
      .update(`${phoneE164}${code}${purpose}${secret}`)
      .digest("hex");

    // 9. Invalidar códigos antigos
    await prisma.clientPhoneVerification.updateMany({
      where: {
        phoneE164,
        purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // 10. Criar verificação
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

    // 11. Enviar WhatsApp
    const message = `Seu código para usar o benefício do clube é: ${code}. Ele expira em 10 minutos.`;
    const sent = await sendWhatsAppText(phoneE164, message);

    // 12. Tratamento de falha no envio
    if (!sent) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Erro ao enviar código via WhatsApp." }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        expiresInMinutes: 10,
        devCode: code,
      });
    }

    return NextResponse.json({
      ok: true,
      expiresInMinutes: 10,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}