import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import SubscribeClubClient from "./SubscribeClubClient";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ planId?: string }>;
};

export default async function SubscribeClubPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { planId } = await searchParams;

  if (!planId) {
    notFound();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      clubEnabled: true,
      clubPaymentProvider: true,
    },
  });

  if (!tenant) {
    notFound();
  }

  const plan = await prisma.clubPlan.findFirst({
    where: {
      id: planId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      terms: true,
      priceInCents: true,
      billingCycle: true,
      discountPercent: true,
    },
  });

  if (!tenant.clubEnabled || !plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">Plano indisponível</h1>
        <p className="mb-6 text-gray-600">
          Este plano não está disponível no momento.
        </p>
        <Link
          href={`/s/${slug}/clube`}
          className="rounded-md px-6 py-2 text-white"
          style={{ backgroundColor: tenant.primaryColor || "#000" }}
        >
          Voltar para o Clube
        </Link>
      </div>
    );
  }

  return (
    <SubscribeClubClient
      slug={slug}
      tenant={{
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        clubPaymentProvider: tenant.clubPaymentProvider,
      }}
      plan={plan}
    />
  );
}
