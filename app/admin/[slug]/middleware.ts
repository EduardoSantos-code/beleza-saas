import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error("SESSION_SECRET não definida");
}

const encodedKey = new TextEncoder().encode(secret);

type SessionPayload = JWTPayload & {
  userId: string;
  role: string;
};

async function readSession(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const session = await readSession(request);
  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith("/admin");
  const isMasterRoute = pathname.startsWith("/master");

  // Se você for MASTER, você pode entrar em QUALQUER lugar
  if (session?.role === "MASTER") {
    return NextResponse.next();
  }

  // Se tentar entrar no Master sem ser Master, volta pro login
  if (isMasterRoute && session?.role !== "MASTER") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Regra padrão: se não estiver logado, vai pro login
  if (isAdminRoute && !session?.userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Agora protegemos o admin, o login e o seu painel master
  matcher: ["/admin/:path*", "/master/:path*", "/login"],
};