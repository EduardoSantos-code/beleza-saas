import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, planId } = body;

    // 1. Validar body
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome inválido (mínimo 2 caracteres)" },
        { status: 400 }
      );
    }
    if (!planId) {
      return NextResponse.json({ error: "Plano é obrigatório" }, { status: 400 });
    }

    // 2. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        clubEnabled: true,
        clubPaymentProvider: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    // 3. Verificar se clube está ativo
    if (!tenant.clubEnabled) {
      return NextResponse.json({ error: "Clube indisponível." }, { status: 400 });
    }

    // 4. Ler cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("club_client_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Valide seu WhatsApp para continuar." },
        { status: 401 }
      );
    }

    // 5. Validar JWT
    const sessionSecret =
      process.env.CLIENT_SESSION_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-only-client-session-secret";

    if (
      process.env.NODE_ENV === "production" &&
      sessionSecret === "dev-only-client-session-secret"
    ) {
      console.error("Missing CLIENT_SESSION_SECRET in production");
      return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }

    let payload: any;
    try {
      const { payload: decoded } = await jwtVerify(
        sessionToken,
        new TextEncoder().encode(sessionSecret)
      );
      payload = decoded;
    } catch (err) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    // 6. Validar Payload
    const phoneRegex = /^\+55\d{11}$/;
    if (
      payload.tenantId !== tenant.id ||
      payload.slug !== tenant.slug ||
      payload.purpose !== "CLUB_SUBSCRIBE" ||
      !phoneRegex.test(payload.phoneE164)
    ) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    // 7. Buscar plano
    const plan = await prisma.clubPlan.findFirst({
      where: {
        id: planId,
        tenantId: tenant.id,
        isActive: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plano indisponível." }, { status: 404 });
    }

    // 8. Upsert Client
    const client = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: tenant.id,
          phoneE164: payload.phoneE164,
        },
      },
      create: {
        tenantId: tenant.id,
        phoneE164: payload.phoneE164,
        name: name.trim(),
      },
      update: {
        name: name.trim(),
      },
    });

    // 9. Definir provider
    const provider = tenant.clubPaymentProvider ?? "ASAAS";

    // 10. Verificar assinatura existente
    let subscription = await prisma.clubSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        clientId: client.id,
        planId: plan.id,
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    // 11. Criar se não existir
    if (!subscription) {
      subscription = await prisma.clubSubscription.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          planId: plan.id,
          provider,
          status: "PENDING",
        },
      });
    }

    // 12. Retornar
    return NextResponse.json({
      ok: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        provider: subscription.provider,
        planId: plan.id,
        planName: plan.name,
      },
      nextStep: "PAYMENT_PENDING",
    });
  } catch (error) {
    console.error("[CLUB_SUBSCRIBE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}