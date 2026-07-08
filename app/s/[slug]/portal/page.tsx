import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientPortalClient from "./ClientPortalClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PortalPage({ params }: PageProps) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      clubEnabled: true,
      minAdvanceHours: true,
      planTier: true,
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <ClientPortalClient 
        slug={slug} 
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
          primaryColor: tenant.primaryColor,
          clubEnabled: tenant.clubEnabled,
          minAdvanceHours: tenant.minAdvanceHours,
          planTier: tenant.planTier,
        }} 
      />
    </main>
  );
}
