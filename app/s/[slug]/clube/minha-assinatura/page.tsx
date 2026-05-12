import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClubPortalClient from "./ClubPortalClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MinhaAssinaturaPage({ params }: PageProps) {
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
    },
  });

  if (!tenant) {
    notFound();
  }

  if (!tenant.clubEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-950 text-center">
        <div className="max-w-md w-full space-y-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Clube indisponível
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Esta barbearia ainda não possui clube ativo.
          </p>
          <Link
            href={`/s/${slug}`}
            className="inline-block mt-4 px-6 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium transition-opacity hover:opacity-90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <ClubPortalClient 
        slug={slug} 
        tenant={tenant} 
      />
    </main>
  );
}