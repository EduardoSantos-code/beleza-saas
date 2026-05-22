import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

type SessionPayload = JWTPayload & {
  userId: string;
  email: string;
  name: string;
  role?: string;
};

const secret = process.env.SESSION_SECRET;
const encodedKey = secret ? new TextEncoder().encode(secret) : null;

async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  if (!encodedKey) return null;

  const token = req.cookies.get("session")?.value;
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

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isMasterRoute = pathname.startsWith("/master");
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";

  if (!secret || !encodedKey) {
    return new NextResponse("SESSION_SECRET não definida", { status: 500 });
  }

  const session = await getSessionFromRequest(req);

  // 1. Protege a área admin pela sessão do sistema
  if (isAdminRoute) {
    if (!session?.userId) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Protege a área master pela sessão real do sistema
  if (isMasterRoute) {
    if (!session?.userId) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "MASTER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 3. Se já estiver logado, evita abrir /login à toa e joga para o destino correto
  if (isLoginRoute && session?.userId) {
    const next = req.nextUrl.searchParams.get("next");

    if (next) {
      // ✅ CORREÇÃO: Redireciona direto para a página que o usuário tentou acessar antes
      try {
        return NextResponse.redirect(new URL(next, req.url));
      } catch {
        // Fallback caso o parâmetro 'next' seja uma URL inválida ou malformada
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (session.role === "MASTER") {
      return NextResponse.redirect(new URL("/master", req.url));
    }

    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Mantemos o matcher isolado para não atrapalhar requisições de API (/api) ou Webhooks
  matcher: ["/admin/:path*", "/master/:path*", "/login"],
};