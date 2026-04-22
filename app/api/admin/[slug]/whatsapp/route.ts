import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const WhatsappConfigSchema = z.object({
  phoneNumberId: z.string().min(3),
  accessToken: z.string().min(10),
  verifyToken: z.string().min(6),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const config = await prisma.whatsappConfig.findUnique({
      where: {
        tenantId: membership.tenantId,
      },
      select: {
        id: true,
        phoneNumberId: true,
        accessToken: true,
        verifyToken: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      config: config
        ? {
            id: config.id,
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken,
            verifyToken: config.verifyToken,
            updatedAt: config.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/whatsapp:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar configuração do WhatsApp" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WhatsappConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const config = await prisma.whatsappConfig.upsert({
      where: {
        tenantId: membership.tenantId,
      },
      update: {
        phoneNumberId: parsed.data.phoneNumberId,
        accessToken: parsed.data.accessToken,
        verifyToken: parsed.data.verifyToken,
      },
      create: {
        tenantId: membership.tenantId,
        phoneNumberId: parsed.data.phoneNumberId,
        accessToken: parsed.data.accessToken,
        verifyToken: parsed.data.verifyToken,
      },
    });

    return NextResponse.json({
      ok: true,
      config: {
        id: config.id,
        phoneNumberId: config.phoneNumberId,
        verifyToken: config.verifyToken,
      },
    });
  } catch (error) {
    console.error("Erro em PUT /api/admin/[slug]/whatsapp:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar configuração do WhatsApp" },
      { status: 500 }
    );
  }
}