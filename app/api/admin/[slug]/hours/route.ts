import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const HourRowSchema = z.object({
  weekday: z.enum(WEEKDAYS),
  isOpen: z.boolean(),
  startMin: z.number().int().min(0).max(1439).nullable(),
  endMin: z.number().int().min(1).max(1440).nullable(),
  breakStartMin: z.number().int().min(0).max(1439).nullable(),
  breakEndMin: z.number().int().min(1).max(1440).nullable(),
});

const BodySchema = z.object({
  tenantHours: z.array(HourRowSchema),
  professionalHours: z.array(
    z.object({
      professionalId: z.string(),
      hours: z.array(HourRowSchema),
    })
  ),
});

function validateHourRow(row: z.infer<typeof HourRowSchema>) {
  if (!row.isOpen) return null;

  if (row.startMin == null || row.endMin == null) {
    return "Horário inicial e final são obrigatórios";
  }

  if (row.endMin <= row.startMin) {
    return "O horário final deve ser maior que o inicial";
  }

  const hasBreakStart = row.breakStartMin != null;
  const hasBreakEnd = row.breakEndMin != null;

  if (hasBreakStart !== hasBreakEnd) {
    return "Preencha início e fim do intervalo";
  }

  if (hasBreakStart && hasBreakEnd) {
    if (row.breakEndMin! <= row.breakStartMin!) {
      return "O fim do intervalo deve ser maior que o início";
    }

    if (row.breakStartMin! < row.startMin || row.breakEndMin! > row.endMin) {
      return "O intervalo deve estar dentro do expediente";
    }
  }

  return null;
}

function sortHours<T extends { weekday: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => WEEKDAYS.indexOf(a.weekday as (typeof WEEKDAYS)[number]) - WEEKDAYS.indexOf(b.weekday as (typeof WEEKDAYS)[number])
  );
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
      include: {
        businessHours: true,
        professionals: {
          where: { active: true },
          include: {
            businessHours: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const tenantHours = sortHours(
      WEEKDAYS.map((weekday) => {
        const row = tenant.businessHours.find((h) => h.weekday === weekday);

        return (
          row || {
            weekday,
            isOpen: false,
            startMin: null,
            endMin: null,
            breakStartMin: null,
            breakEndMin: null,
          }
        );
      })
    );

    const professionals = tenant.professionals.map((professional) => ({
      id: professional.id,
      name: professional.name,
      hours: sortHours(
        WEEKDAYS.map((weekday) => {
          const row = professional.businessHours.find((h) => h.weekday === weekday);
          const fallback = tenantHours.find((h) => h.weekday === weekday);

          return (
            row || {
              weekday,
              isOpen: fallback?.isOpen ?? false,
              startMin: fallback?.startMin ?? null,
              endMin: fallback?.endMin ?? null,
              breakStartMin: fallback?.breakStartMin ?? null,
              breakEndMin: fallback?.breakEndMin ?? null,
            }
          );
        })
      ),
    }));

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      tenantHours,
      professionals,
    });
  } catch (error) {
    console.error("Erro em /api/admin/[slug]/hours:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar horários" },
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
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    for (const row of parsed.data.tenantHours) {
      const error = validateHourRow(row);
      if (error) {
        return NextResponse.json(
          { error: `${row.weekday}: ${error}` },
          { status: 400 }
        );
      }
    }

    for (const professional of parsed.data.professionalHours) {
      for (const row of professional.hours) {
        const error = validateHourRow(row);
        if (error) {
          return NextResponse.json(
            { error: `${professional.professionalId} - ${row.weekday}: ${error}` },
            { status: 400 }
          );
        }
      }
    }

    const professionals = await prisma.professional.findMany({
      where: {
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    const professionalIds = new Set(professionals.map((p) => p.id));

    const operations = [];

    for (const row of parsed.data.tenantHours) {
      operations.push(
        prisma.tenantBusinessHour.upsert({
          where: {
            tenantId_weekday: {
              tenantId: membership.tenantId,
              weekday: row.weekday,
            },
          },
          update: {
            isOpen: row.isOpen,
            startMin: row.isOpen ? row.startMin : null,
            endMin: row.isOpen ? row.endMin : null,
            breakStartMin: row.isOpen ? row.breakStartMin : null,
            breakEndMin: row.isOpen ? row.breakEndMin : null,
          },
          create: {
            tenantId: membership.tenantId,
            weekday: row.weekday,
            isOpen: row.isOpen,
            startMin: row.isOpen ? row.startMin : null,
            endMin: row.isOpen ? row.endMin : null,
            breakStartMin: row.isOpen ? row.breakStartMin : null,
            breakEndMin: row.isOpen ? row.breakEndMin : null,
          },
        })
      );
    }

    for (const professional of parsed.data.professionalHours) {
      if (!professionalIds.has(professional.professionalId)) {
        return NextResponse.json(
          { error: "Profissional inválido para este salão" },
          { status: 400 }
        );
      }

      for (const row of professional.hours) {
        operations.push(
          prisma.professionalBusinessHour.upsert({
            where: {
              professionalId_weekday: {
                professionalId: professional.professionalId,
                weekday: row.weekday,
              },
            },
            update: {
              isOpen: row.isOpen,
              startMin: row.isOpen ? row.startMin : null,
              endMin: row.isOpen ? row.endMin : null,
              breakStartMin: row.isOpen ? row.breakStartMin : null,
              breakEndMin: row.isOpen ? row.breakEndMin : null,
            },
            create: {
              professionalId: professional.professionalId,
              weekday: row.weekday,
              isOpen: row.isOpen,
              startMin: row.isOpen ? row.startMin : null,
              endMin: row.isOpen ? row.endMin : null,
              breakStartMin: row.isOpen ? row.breakStartMin : null,
              breakEndMin: row.isOpen ? row.breakEndMin : null,
            },
          })
        );
      }
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro em PUT /api/admin/[slug]/hours:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar horários" },
      { status: 500 }
    );
  }
}