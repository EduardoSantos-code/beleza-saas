import { NextResponse } from "next/server";
import { cookies } from "next/headers"; // Importação continua igual
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // No Next.js 15, precisamos colocar o 'await' antes de cookies()
    const cookieStore = await cookies(); 
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Não logado" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { name: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro na API /me:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}