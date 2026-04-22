import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateBlockSchema = z.object({
  professionalId: z.string().nullable().optional(),
  title: z.string().min(2).max(120),
  startAtISO: z.string().min(1),
  endAtISO: z.string().min(1),
  allDay: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date é obrigatório" }, { status: 400 });
    }

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    const [professionals, blocks] = await Promise.all([
      prisma.professional.findMany({
        where: {
          tenantId: membership.tenantId,
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.scheduleBlock.findMany({
        where: {
          tenantId: membership.tenantId,
          startAt: { lt: end },
          endAt: { gt: start },
        },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      professionals,
      blocks: blocks.map((block) => ({
        id: block.id,
        title: block.title,
        startAt: block.startAt,
        endAt: block.endAt,
        allDay: block.allDay,
        professional: block.professional
          ? {
              id: block.professional.id,
              name: block.professional.name,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Erro em /api/admin/[slug]/blocks:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar bloqueios" },
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
    const parsed = CreateBlockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const startAt = new Date(parsed.data.startAtISO);
    const endAt = new Date(parsed.data.endAtISO);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "Data/hora inválida" }, { status: 400 });
    }

    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "O horário final deve ser maior que o inicial" },
        { status: 400 }
      );
    }

    let professionalId: string | null = parsed.data.professionalId ?? null;

    if (professionalId) {
      const professional = await prisma.professional.findFirst({
        where: {
          id: professionalId,
          tenantId: membership.tenantId,
        },
        select: { id: true },
      });

      if (!professional) {
        return NextResponse.json(
          { error: "Profissional inválida para este salão" },
          { status: 400 }
        );
      }
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        tenantId: membership.tenantId,
        professionalId,
        title: parsed.data.title,
        startAt,
        endAt,
        allDay: parsed.data.allDay ?? false,
      },
    });

    return NextResponse.json({ ok: true, block }, { status: 201 });
  } catch (error) {
    console.error("Erro em POST /api/admin/[slug]/blocks:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar bloqueio" },
      { status: 500 }
    );
  }
}