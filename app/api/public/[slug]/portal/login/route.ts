import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setClientSession } from "@/lib/client-auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { phoneE164, name } = body;

    if (!phoneE164 || !/^\+55\d{11}$/.test(phoneE164)) {
      return NextResponse.json(
        { error: "WhatsApp inválido. Formato: +55 seguido de DDD e 9 dígitos." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    // 1. Procurar o cliente pelo telefone no tenant específico
    let client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        phoneE164,
      },
    });

    if (!client) {
      // Se não enviou o nome, informa que não é cadastrado para pedir o nome na tela
      if (!name || name.trim().length < 3) {
        return NextResponse.json({ registered: false });
      }

      // Se enviou o nome, criamos o cliente para que ele possa prosseguir
      client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: name.trim(),
          phoneE164,
        },
      });
    }

    // 2. Definir cookie de sessão
    await setClientSession(tenant.slug, tenant.id, client.id, phoneE164);

    return NextResponse.json({
      registered: true,
      name: client.name,
      phoneE164: client.phoneE164,
    });
  } catch (error) {
    console.error("[PORTAL_LOGIN_POST]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
