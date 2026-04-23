import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const BrandingSchema = z.object({
  name: z.string().min(2).max(120),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  publicDescription: z.string().max(500).nullable().optional(),
  publicPhone: z.string().max(30).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  instagram: z.string().max(120).nullable().optional(),
  logoUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  heroImageUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  minAdvanceHours: z.number().int().min(0).default(2),
});

function normalizeNullable(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

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
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        heroImageUrl: true,
        primaryColor: true,
        publicDescription: true,
        publicPhone: true,
        address: true,
        instagram: true,
        minAdvanceHours: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/branding:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar branding" },
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
    const parsed = BrandingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: membership.tenantId },
      data: {
        name: parsed.data.name,
        primaryColor: parsed.data.primaryColor,
        publicDescription: normalizeNullable(parsed.data.publicDescription),
        publicPhone: normalizeNullable(parsed.data.publicPhone),
        address: normalizeNullable(parsed.data.address),
        instagram: normalizeNullable(parsed.data.instagram),
        logoUrl: normalizeNullable(parsed.data.logoUrl || null),
        heroImageUrl: normalizeNullable(parsed.data.heroImageUrl || null),
        minAdvanceHours: parsed.data.minAdvanceHours,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        heroImageUrl: true,
        primaryColor: true,
        publicDescription: true,
        publicPhone: true,
        address: true,
        instagram: true,
        minAdvanceHours: true,
      },
    });

    return NextResponse.json({ ok: true, tenant });
  } catch (error) {
    console.error("Erro em PUT /api/admin/[slug]/branding:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar branding" },
      { status: 500 }
    );
  }
}