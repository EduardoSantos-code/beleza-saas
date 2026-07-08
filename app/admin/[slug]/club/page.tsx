import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import ClubPlansClient from "./ClubPlansClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ClubAdminPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Validar acesso do usuário ao tenant pelo slug
  await requireTenantAccess(slug);

  // 2. Buscar Tenant por slug com campos específicos
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      clubEnabled: true,
      clubPaymentProvider: true,
      planTier: true,
    },
  });

  // 3. Se não encontrar, usar notFound()
  if (!tenant) {
    notFound();
  }

  // 4. Buscar ClubPlan do tenant ordenado por createdAt desc
  const plans = await prisma.clubPlan.findMany({
    where: {
      tenantId: tenant.id,
    },
    include: {
      includedService: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // 5. Buscar serviços do tenant
  const services = await prisma.service.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  return (
    <div className="container mx-auto py-6">
      <ClubPlansClient
        slug={slug}
        initialTenant={tenant}
        initialPlans={plans}
        initialServices={services}
      />
    </div>
  );
}