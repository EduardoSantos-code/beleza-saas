import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateServiceSchema = z.object({
  name: z.string().min(2).max(120),
  durationMin: z.number().int().min(5).max(480),
  price: z.number().int().min(0).max(100000000),
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

    const services = await prisma.service.findMany({
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
      services,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/services:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar serviços" },
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
    const parsed = CreateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        tenantId: membership.tenantId,
        name: parsed.data.name,
        durationMin: parsed.data.durationMin,
        price: parsed.data.price,
        active: parsed.data.active ?? true,
      },
    });

    return NextResponse.json({ ok: true, service }, { status: 201 });
  } catch (error) {
    console.error("Erro em POST /api/admin/[slug]/services:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar serviço" },
      { status: 500 }
    );
  }
}