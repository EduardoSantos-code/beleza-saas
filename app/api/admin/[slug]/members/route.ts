// app/api/admin/[slug]/members/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyManagerApiAccess } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/password";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { authorized, response, membership: currentMembership } = await verifyManagerApiAccess(slug);
    if (!authorized || !currentMembership) return response!;

    // Buscar todos os membros (memberships) da barbearia
    const memberships = await prisma.membership.findMany({
      where: { tenantId: currentMembership.tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { role: "asc" },
    });

    // Buscar todos os profissionais da barbearia
    const professionals = await prisma.professional.findMany({
      where: { tenantId: currentMembership.tenantId, active: true },
      select: {
        id: true,
        name: true,
        userId: true,
      },
      orderBy: { name: "asc" },
    });

    // Mapear os membros e associar o profissional correspondente se houver
    const members = memberships.map((m) => {
      const linkedProfessional = professionals.find((p) => p.userId === m.userId);
      return {
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        linkedProfessionalId: linkedProfessional?.id || null,
        linkedProfessionalName: linkedProfessional?.name || null,
      };
    });

    return NextResponse.json({ members, professionals });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/members:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { authorized, response, membership: currentMembership } = await verifyManagerApiAccess(slug);
    if (!authorized || !currentMembership) return response!;

    const body = await req.json();
    const { name, email, role, professionalId } = body as {
      name: string;
      email: string;
      role: "MANAGER" | "STAFF";
      professionalId?: string | null;
    };

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Nome, e-mail e cargo são obrigatórios." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Buscar tenant para obter o nome no e-mail
    const tenant = await prisma.tenant.findUnique({
      where: { id: currentMembership.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
    }

    // Verificar se o usuário já existe
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let isNewUser = false;
    let token = "";
    
    if (!user) {
      isNewUser = true;
      // Gerar senha aleatória temporária
      const tempPassword = randomBytes(16).toString("hex");
      const passwordHash = hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
        },
      });
    }

    // Verificar se o usuário já possui membership para este tenant
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Este usuário já faz parte desta barbearia." },
        { status: 409 }
      );
    }

    // Iniciar transação para criar membership e vincular profissional
    await prisma.$transaction(async (tx) => {
      // Criar o membership
      await tx.membership.create({
        data: {
          userId: user!.id,
          tenantId: tenant.id,
          role,
        },
      });

      // Vincular profissional se for fornecido
      if (professionalId) {
        // Desvincular de outros se estiver vinculado
        await tx.professional.updateMany({
          where: { userId: user!.id, tenantId: tenant.id },
          data: { userId: null },
        });

        // Vincular ao profissional desejado
        await tx.professional.update({
          where: { id: professionalId },
          data: { userId: user!.id },
        });
      }
    });

    // Configuração de envio de e-mail via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || "TratoMarcado <onboarding@resend.dev>";
    const reqUrl = new URL(req.url);
    const origin = reqUrl.origin;

    if (isNewUser) {
      // Gerar token de redefinição de senha para ativação
      token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token,
          expiresAt,
        },
      });

      const activationLink = `${origin}/reset-password?token=${token}`;

      // Imprime no console apenas em modo de desenvolvimento
      if (process.env.NODE_ENV !== "production") {
        console.log(`[CONVITE] Link de ativação para ${normalizedEmail}: ${activationLink}`);
      }

      if (!resendApiKey) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Serviço de envio de e-mails não configurado no servidor." }, { status: 500 });
        }
        console.warn("⚠️ [Resend] Chave de API não configurada. Simulando envio de convite.");
        return NextResponse.json({
          ok: true,
          message: "Usuário convidado. Ative a conta usando o link simulado.",
          mockLink: activationLink,
        });
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Convite para o TratoMarcado</title>
          <style>
            body { font-family: sans-serif; background-color: #09090b; color: #f4f4f5; padding: 20px; }
            .card { background-color: #18181b; border-radius: 16px; padding: 30px; text-align: center; max-width: 500px; margin: 0 auto; }
            .logo { font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 20px; }
            .btn { display: inline-block; background-color: #10b981; color: #09090b !important; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Trato<span style="color:#10b981">Marcado</span></div>
            <h2>Você foi convidado!</h2>
            <p>Fala, ${name}! O gestor da barbearia <strong>${tenant.name}</strong> te convidou para acessar o painel de controle.</p>
            <p>Clique no botão abaixo para definir sua senha e ativar sua conta de acesso.</p>
            <a href="${activationLink}" class="btn">Definir Senha e Acessar</a>
            <p style="font-size:11px; color:#71717a;">Este link de ativação expira em 24 horas.</p>
          </div>
        </body>
        </html>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [normalizedEmail],
          subject: `Você foi convidado para a barbearia ${tenant.name} — TratoMarcado`,
          html: emailHtml,
        }),
      });
    } else {
      // Usuário existente: apenas notifica
      if (!resendApiKey) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Serviço de envio de e-mails não configurado no servidor." }, { status: 500 });
        }
        console.warn("⚠️ [Resend] Chave de API não configurada. Simulando envio de e-mail.");
        console.log(`[CONVITE_EXISTENTE_MOCK] ${normalizedEmail} foi adicionado à barbearia ${tenant.name}`);
        return NextResponse.json({ ok: true, message: "Membro adicionado com sucesso." });
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Acesso à nova barbearia no TratoMarcado</title>
        </head>
        <body style="font-family: sans-serif; background-color: #09090b; color: #f4f4f5; padding: 20px;">
          <div style="background-color: #18181b; border-radius: 16px; padding: 30px; text-align: center; max-width: 500px; margin: 0 auto;">
            <h2>Nova Barbearia Associada!</h2>
            <p>Olá, ${user.name}! Você foi associado à barbearia <strong>${tenant.name}</strong>.</p>
            <p>Você pode acessar o painel administrativo usando suas credenciais habituais.</p>
            <a href="${origin}/admin/${tenant.slug}" style="display: inline-block; background-color: #10b981; color: #09090b; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 8px; margin: 20px 0;">Ir para o Painel</a>
          </div>
        </body>
        </html>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [normalizedEmail],
          subject: `Você foi adicionado à barbearia ${tenant.name} — TratoMarcado`,
          html: emailHtml,
        }),
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Membro adicionado com sucesso.",
      mockLink: (process.env.NODE_ENV !== "production" && token) 
        ? `${origin}/reset-password?token=${token}` 
        : undefined,
    });
  } catch (error) {
    console.error("Erro em POST /api/admin/[slug]/members:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { authorized, response, membership: currentMembership } = await verifyManagerApiAccess(slug);
    if (!authorized || !currentMembership) return response!;

    const body = await req.json();
    const { membershipId, role, professionalId } = body as {
      membershipId: string;
      role?: "OWNER" | "MANAGER" | "STAFF";
      professionalId?: string | null;
    };

    if (!membershipId) {
      return NextResponse.json({ error: "ID do membro é obrigatório." }, { status: 400 });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!targetMembership || targetMembership.tenantId !== currentMembership.tenantId) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    // Não permitir editar o papel do OWNER do salão (bloquear alteração de cargo)
    if (targetMembership.role === "OWNER" && role && role !== "OWNER") {
      return NextResponse.json({ error: "Não é permitido alterar o cargo do proprietário." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar cargo
      if (role) {
        await tx.membership.update({
          where: { id: membershipId },
          data: { role },
        });
      }

      // 2. Atualizar profissional associado
      if (professionalId !== undefined) {
        // Desvincular de qualquer outro profissional deste salão para este usuário
        await tx.professional.updateMany({
          where: { userId: targetMembership.userId, tenantId: currentMembership.tenantId },
          data: { userId: null },
        });

        // Vincular ao novo profissional
        if (professionalId) {
          await tx.professional.update({
            where: { id: professionalId },
            data: { userId: targetMembership.userId },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro em PATCH /api/admin/[slug]/members:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { authorized, response, membership: currentMembership } = await verifyManagerApiAccess(slug);
    if (!authorized || !currentMembership) return response!;

    const { searchParams } = new URL(req.url);
    const membershipId = searchParams.get("membershipId");

    if (!membershipId) {
      return NextResponse.json({ error: "ID do membro é obrigatório." }, { status: 400 });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!targetMembership || targetMembership.tenantId !== currentMembership.tenantId) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    // Bloquear a remoção do OWNER
    if (targetMembership.role === "OWNER") {
      return NextResponse.json({ error: "Não é permitido remover o proprietário." }, { status: 400 });
    }

    // Remover membership e desvincular do profissional
    await prisma.$transaction([
      prisma.professional.updateMany({
        where: { userId: targetMembership.userId, tenantId: currentMembership.tenantId },
        data: { userId: null },
      }),
      prisma.membership.delete({
        where: { id: membershipId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro em DELETE /api/admin/[slug]/members:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
