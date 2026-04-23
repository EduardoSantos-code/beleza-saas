import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const BulkServiceSchema = z.array(
  z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    durationMin: z.number().int().positive(),
    priceCents: z.number().int().nonnegative(),
    active: z.boolean().default(true),
  })
);

export async function POST(
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
    const parsed = BulkServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Adiciona o tenantId em todos os serviços recebidos
    const servicesToCreate = parsed.data.map((service) => ({
      ...service,
      tenantId: membership.tenantId,
    }));

    // Cria todos de uma vez usando createMany
    const created = await prisma.service.createMany({
      data: servicesToCreate,
    });

    return NextResponse.json({ ok: true, count: created.count });
  } catch (error) {
    console.error("Erro em POST /api/admin/[slug]/services/bulk:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar serviços em lote" },
      { status: 500 }
    );
  }
}