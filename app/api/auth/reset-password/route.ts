// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    // 1. Procurar token no banco
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Link de recuperação inválido ou expirado" },
        { status: 400 }
      );
    }

    // 2. Verificar se está expirado
    const isExpired = new Date() > resetToken.expiresAt;
    if (isExpired) {
      // Deleta o token expirado para manter o banco limpo
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }).catch(() => undefined);

      return NextResponse.json(
        { error: "Link de recuperação expirado. Solicite outro." },
        { status: 400 }
      );
    }

    // 3. Atualizar a senha do usuário
    const passwordHash = hashPassword(password);

    await prisma.$transaction([
      // Atualiza o hash da senha do usuário
      prisma.user.update({
        where: { email: resetToken.email },
        data: { passwordHash },
      }),
      // Remove o token para evitar reaproveitamento
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return NextResponse.json({
      message: "Senha atualizada com sucesso! Você já pode fazer login.",
    });

  } catch (error) {
    console.error("Erro em POST /api/auth/reset-password:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
