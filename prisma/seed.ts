import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../lib/password";

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

type Weekday = (typeof WEEKDAYS)[number];

function defaultTenantHour(weekday: Weekday) {
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

function defaultProfessionalHour(name: string, weekday: Weekday) {
  if (name === "Ana") {
    if (
      weekday === "TUESDAY" ||
      weekday === "WEDNESDAY" ||
      weekday === "THURSDAY" ||
      weekday === "FRIDAY"
    ) {
      return {
        isOpen: true,
        startMin: 10 * 60,
        endMin: 19 * 60,
        breakStartMin: 13 * 60,
        breakEndMin: 14 * 60,
      };
    }

    if (weekday === "SATURDAY") {
      return {
        isOpen: true,
        startMin: 9 * 60,
        endMin: 15 * 60,
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

  if (name === "Carla") {
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

    return {
      isOpen: false,
      startMin: null,
      endMin: null,
      breakStartMin: null,
      breakEndMin: null,
    };
  }

  return defaultTenantHour(weekday);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL não definida");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "studio-bella" },
    update: {
      name: "Studio Bella",
      timezone: "America/Sao_Paulo",
      primaryColor: "#7c3aed",
      publicDescription:
        "Agende seus horários com praticidade no Studio Bella. Atendimento profissional para cabelo, unhas e beleza em geral.",
      publicPhone: "+5511999999999",
      address: "Rua Exemplo, 123 - Centro",
      instagram: "@studiobella",
      heroImageUrl:
        "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
      logoUrl:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80",
    },
    create: {
      name: "Studio Bella",
      slug: "studio-bella",
      timezone: "America/Sao_Paulo",
      primaryColor: "#7c3aed",
      publicDescription:
        "Agende seus horários com praticidade no Studio Bella. Atendimento profissional para cabelo, unhas e beleza em geral.",
      publicPhone: "+5511999999999",
      address: "Rua Exemplo, 123 - Centro",
      instagram: "@studiobella",
      heroImageUrl:
        "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
      logoUrl:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@studiobella.com" },
    update: {
      name: "Admin Studio Bella",
      passwordHash: hashPassword("12345678"),
    },
    create: {
      name: "Admin Studio Bella",
      email: "admin@studiobella.com",
      passwordHash: hashPassword("12345678"),
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  const professionalsCount = await prisma.professional.count({
    where: { tenantId: tenant.id },
  });

  if (professionalsCount === 0) {
    await prisma.professional.createMany({
      data: [
        { tenantId: tenant.id, name: "Ana" },
        { tenantId: tenant.id, name: "Carla" },
      ],
    });
  }

  const servicesCount = await prisma.service.count({
    where: { tenantId: tenant.id },
  });

  if (servicesCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: "Corte feminino",
          durationMin: 60,
          price: 7000,
        },
        {
          tenantId: tenant.id,
          name: "Escova",
          durationMin: 45,
          price: 5000,
        },
        {
          tenantId: tenant.id,
          name: "Manicure",
          durationMin: 40,
          price: 3500,
        },
      ],
    });
  }

  for (const weekday of WEEKDAYS) {
    const defaults = defaultTenantHour(weekday);

    await prisma.tenantBusinessHour.upsert({
      where: {
        tenantId_weekday: {
          tenantId: tenant.id,
          weekday,
        },
      },
      update: defaults,
      create: {
        tenantId: tenant.id,
        weekday,
        ...defaults,
      },
    });
  }

  const professionals = await prisma.professional.findMany({
    where: { tenantId: tenant.id },
  });

  for (const professional of professionals) {
    for (const weekday of WEEKDAYS) {
      const defaults = defaultProfessionalHour(professional.name, weekday);

      await prisma.professionalBusinessHour.upsert({
        where: {
          professionalId_weekday: {
            professionalId: professional.id,
            weekday,
          },
        },
        update: defaults,
        create: {
          professionalId: professional.id,
          weekday,
          ...defaults,
        },
      });
    }
  }

  console.log("Login admin:");
  console.log("email: admin@studiobella.com");
  console.log("senha: 12345678");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erro no seed:", e);
  process.exit(1);
});