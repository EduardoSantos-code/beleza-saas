import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  next: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos" },
        { status: 401 }
      );
    }

    const validPassword = verifyPassword(
      parsed.data.password,
      user.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos" },
        { status: 401 }
      );
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        tenant: {
          select: {
            slug: true,
          },
        },
      },
      take: 1,
    });

    const redirectTo =
      parsed.data.next && parsed.data.next.startsWith("/admin/")
        ? parsed.data.next
        : memberships[0]
        ? `/admin/${memberships[0].tenant.slug}`
        : "/";

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      ok: true,
      redirectTo,
    });
  } catch (error) {
    console.error("Erro em /api/auth/login:", error);

    return NextResponse.json(
      { error: "Erro interno no login" },
      { status: 500 }
    );
  }
}