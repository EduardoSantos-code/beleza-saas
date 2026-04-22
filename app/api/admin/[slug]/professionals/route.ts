import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateProfessionalSchema = z.object({
  name: z.string().min(2).max(120),
  active: z.boolean().optional(),
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

    const professionals = await prisma.professional.findMany({
      where: {
        tenantId: membership.tenantId,
      },
      orderBy: [
        { active: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      professionals,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/professionals:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar profissionais" },
      { status: 500 }
    );
  }
}

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
    const parsed = CreateProfessionalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const professional = await prisma.professional.create({
      data: {
        tenantId: membership.tenantId,
        name: parsed.data.name,
        active: parsed.data.active ?? true,
      },
    });

    return NextResponse.json({ ok: true, professional }, { status: 201 });
  } catch (error) {
    console.error("Erro em POST /api/admin/[slug]/professionals:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar profissional" },
      { status: 500 }
    );
  }
}