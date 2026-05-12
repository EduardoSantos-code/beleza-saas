import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Buscar tenant por slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        clubEnabled: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    // 3. Ler cookie club_portal_session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("club_portal_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Sessão expirada. Valide seu WhatsApp novamente." },
        { status: 401 }
      );
    }

    // 4. Validar JWT
    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    let payload: any;
    try {
      const { payload: decoded } = await jwtVerify(
        sessionCookie.value,
        new TextEncoder().encode(sessionSecret)
      );
      payload = decoded;
    } catch (err) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada." },
        { status: 401 }
      );
    }

    // 6. Validar payload
    const isValidPayload =
      payload.tenantId === tenant.id &&
      payload.slug === tenant.slug &&
      payload.purpose === "CLUB_PORTAL" &&
      payload.clientId &&
      /^\+55\d{11}$/.test(payload.phoneE164);

    if (!isValidPayload) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    // 7. Buscar client
    const client = await prisma.client.findFirst({
      where: {
        id: payload.clientId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
        phoneE164: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    // 8. Buscar ClubSubscription
    const subscriptions = await prisma.clubSubscription.findMany({
      where: {
        clientId: client.id,
        tenantId: tenant.id,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 9. Retornar dados formatados (sem dados sensíveis de gateway)
    return NextResponse.json({
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
      },
      client: {
        name: client.name,
        phoneE164: client.phoneE164,
      },
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        status: sub.status,
        provider: sub.provider,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        canceledAt: sub.canceledAt,
        createdAt: sub.createdAt,
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          description: sub.plan.description,
          terms: sub.plan.terms,
          priceInCents: sub.plan.priceInCents,
          billingCycle: sub.plan.billingCycle,
          discountPercent: sub.plan.discountPercent,
        },
      })),
    });
  } catch (error) {
    console.error("[CLUB_PORTAL_ME_GET]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}