import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validação dos dados que chegam do formulário
const BrandingSchema = z.object({
  name: z.string().min(1),
  primaryColor: z.string().nullable(),
  logoUrl: z.string().nullable(),
  heroImageUrl: z.string().nullable(),
  publicDescription: z.string().nullable(),
  publicPhone: z.string().nullable(),
  instagram: z.string().nullable(),
  address: z.string().nullable(),
  minAdvanceHours: z.number().int().min(0).default(2), // O novo campo
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: {
        name: true,
        primaryColor: true,
        logoUrl: true,
        heroImageUrl: true,
        publicDescription: true,
        publicPhone: true,
        instagram: true,
        address: true,
        minAdvanceHours: true,
      },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar branding" }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = BrandingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Atualiza o salão no banco de dados com todos os campos validados
    const updated = await prisma.tenant.update({
      where: { id: membership.tenantId },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao salvar branding:", error);
    return NextResponse.json({ error: "Erro ao salvar no banco de dados" }, { status: 500 });
  }
}