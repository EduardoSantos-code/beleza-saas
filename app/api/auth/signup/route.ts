import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
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

function normalizeSlug(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultTenantHour(weekday: (typeof WEEKDAYS)[number]) {
  if (
    weekday === "MONDAY" ||
    weekday === "TUESDAY" ||
    weekday === "WEDNESDAY" ||
    weekday === "THURSDAY" ||
    weekday === "FRIDAY"
  ) {
    return {
      isOpen: true,
      startMin: 9 * 60,
      endMin: 18 * 60,
      breakStartMin: 12 * 60,
      breakEndMin: 13 * 60,
    };
  }

  if (weekday === "SATURDAY") {
    return {
      isOpen: true,
      startMin: 9 * 60,
      endMin: 14 * 60,
      breakStartMin: null,
      breakEndMin: null,
    };
  }

  return {
    isOpen: false,
    startMin: null,
    endMin: null,
    breakStartMin: null,
    breakEndMin: null,
  };
}

const SignupSchema = z.object({
  tenantName: z.string().min(2).max(120),
  slug: z.string().min(2).max(60),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tenantName = parsed.data.tenantName.trim();
    const ownerName = parsed.data.ownerName.trim();
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const slug = normalizeSlug(parsed.data.slug);

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { error: "Slug inválido" },
        { status: 400 }
      );
    }

    const [existingUser, existingTenant] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.tenant.findUnique({
        where: { slug },
        select: { id: true },
      }),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail" },
        { status: 409 }
      );
    }

    if (existingTenant) {
      return NextResponse.json(
        { error: "Este slug já está em uso" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          passwordHash,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
          timezone: "America/Sao_Paulo",
          primaryColor: "#7c3aed",
          subscriptionStatus: "TRIALING",
          trialEndsAt,
          publicDescription:
            "Agendamento online prático e profissional para seu salão.",
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "OWNER",
        },
      });

      const professional = await tx.professional.create({
        data: {
          tenantId: tenant.id,
          name: ownerName,
          active: true,
        },
      });

      await tx.service.create({
        data: {
          tenantId: tenant.id,
          name: "Serviço principal",
          durationMin: 60,
          price: 5000,
          active: true,
        },
      });

      await tx.tenantBusinessHour.createMany({
        data: WEEKDAYS.map((weekday) => ({
          tenantId: tenant.id,
          weekday,
          ...defaultTenantHour(weekday),
        })),
      });

      await tx.professionalBusinessHour.createMany({
        data: WEEKDAYS.map((weekday) => ({
          professionalId: professional.id,
          weekday,
          ...defaultTenantHour(weekday),
        })),
      });

      return { user, tenant };
    });

    await createSession({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });

    return NextResponse.json({
      ok: true,
      redirectTo: `/admin/${result.tenant.slug}`,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/auth/signup:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno ao criar conta" },
      { status: 500 }
    );
  }
}