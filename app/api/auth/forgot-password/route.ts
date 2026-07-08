// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Para evitar User Enumeration, fingimos sucesso mesmo que o e-mail não exista
    if (!user) {
      return NextResponse.json({
        message: "Se o e-mail estiver cadastrado, você receberá um link de redefinição.",
      });
    }

    // 2. Gerar Token Seguro e Expiração (1 hora)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora a partir de agora

    // Salvar token no banco
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    // 3. Preparar Link de Redefinição
    const reqUrl = new URL(req.url);
    const origin = reqUrl.origin;
    const resetLink = `${origin}/reset-password?token=${token}`;

    // 4. Enviar E-mail via Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || "TratoMarcado <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.warn("⚠️ [Resend] Chave de API não configurada. Simulando envio no console.");
      console.log(`[FORGOT_PASSWORD_LINK_MOCK] Link para redefinir senha: ${resetLink}`);
      
      return NextResponse.json({
        message: "Link gerado no console (Modo Desenvolvimento).",
        mockLink: process.env.NODE_ENV === "development" ? resetLink : undefined,
      });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recupere sua senha - TratoMarcado</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #09090b;
            color: #f4f4f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .card {
            background-color: #18181b;
            border: 1px border #27272a;
            border-radius: 24px;
            padding: 40px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 900;
            font-style: italic;
            color: #ffffff;
            margin-bottom: 24px;
            text-transform: uppercase;
          }
          .highlight {
            color: #10b981;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 16px;
            color: #ffffff;
          }
          p {
            font-size: 14px;
            color: #a1a1aa;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .btn {
            display: inline-block;
            background-color: #10b981;
            color: #09090b !important;
            text-decoration: none;
            font-weight: 900;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            padding: 16px 32px;
            border-radius: 16px;
            transition: all 0.2s ease;
          }
          .footer {
            margin-top: 32px;
            font-size: 11px;
            color: #52525b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .link-fallback {
            font-size: 11px;
            color: #71717a;
            word-break: break-all;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">Trato<span class="highlight">Marcado</span></div>
            <h1>Recuperação de Senha</h1>
            <p>Fala, ${user.name}! Recebemos uma solicitação para redefinir a senha da sua conta de acesso ao TratoMarcado. Clique no botão abaixo para escolher uma nova senha de acesso.</p>
            
            <a href="${resetLink}" class="btn">Definir Nova Senha</a>
            
            <div class="link-fallback">
              Se o botão não funcionar, copie e cole o link a seguir no seu navegador:<br>
              <a href="${resetLink}" style="color: #10b981;">${resetLink}</a>
            </div>

            <p style="margin-top: 32px; font-size: 12px; color: #71717a;">Este link expira em 1 hora. Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>
            
            <div class="footer">TratoMarcado — Gestão Inteligente</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [normalizedEmail],
        subject: "Recupere sua senha — TratoMarcado",
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("❌ [Resend] Erro ao enviar e-mail:", resendData);
      return NextResponse.json(
        { error: "Erro ao disparar o e-mail de recuperação" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Se o e-mail estiver cadastrado, você receberá um link de redefinição.",
    });

  } catch (error) {
    console.error("Erro em POST /api/auth/forgot-password:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
