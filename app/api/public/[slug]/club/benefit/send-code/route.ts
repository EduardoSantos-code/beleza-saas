import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { phoneE164 } = await req.json();

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
    });

    if (!client) {
      return NextResponse.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        status: "ACTIVE",
        currentPeriodEnd: { gte: new Date() },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const purpose = "CLUB_USE_BENEFIT";

    const secret =
      process.env.CLIENT_OTP_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-otp-secret";

    const codeHash = crypto
      .createHash("sha256")
      .update(`${phoneE164}${code}${purpose}${secret}`)
      .digest("hex");

    await prisma.clientPhoneVerification.updateMany({
      where: {
        phoneE164,
        purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
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
          "[CLUB_USE_BENEFIT_WHATSAPP_FAILURE]",
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
      console.error("[CLUB_USE_BENEFIT_WHATSAPP_FAILURE]", error);

      return NextResponse.json(
        { error: "Erro ao enviar código via WhatsApp." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[CLUB_USE_BENEFIT_SEND_CODE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
