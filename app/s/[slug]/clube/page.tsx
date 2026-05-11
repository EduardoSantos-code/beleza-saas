import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Crown, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const translateBillingCycle = (cycle: string) => {
  const cycles: Record<string, string> = {
    MONTHLY: "mensal",
    QUARTERLY: "trimestral",
    SEMIANNUAL: "semestral",
    YEARLY: "anual",
  };
  return cycles[cycle] || cycle.toLowerCase();
};

export default async function ClubPublicPage({ params }: PageProps) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (!tenant) {
    notFound();
  }

  const plans = await prisma.clubPlan.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    orderBy: {
      priceInCents: "asc",
    },
  });

  const isClubAvailable = tenant.clubEnabled && plans.length > 0;

  if (!isClubAvailable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Clube indisponível</h1>
        <p className="text-muted-foreground mb-6">
          Esta barbearia ainda não possui planos ativos no momento.
        </p>
        <Link
          href={`/s/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para agendamento
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href={`/s/${slug}`} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h2 className="font-semibold text-lg leading-tight">{tenant.name}</h2>
            <p className="text-sm text-muted-foreground">Clube de Assinaturas</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Escolha seu Plano</h1>
          <p className="text-muted-foreground">
            Assine um de nossos planos exclusivos criados pela nossa barbearia e garanta benefícios recorrentes.
          </p>
        </div>

        <div className="grid gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              {plan.discountPercent && (
                <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                  {plan.discountPercent}% OFF
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">
                    {formatPrice(plan.priceInCents)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{translateBillingCycle(plan.billingCycle)}
                  </span>
                </div>
              </div>

              {plan.description && (
                <p className="text-sm text-muted-foreground mb-6">
                  {plan.description}
                </p>
              )}

              {plan.terms && (
                <div className="mb-6 space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{plan.terms}</span>
                  </div>
                </div>
              )}

              <Link
                href={`/s/${slug}/clube/assinar?planId=${plan.id}`}
                className="block w-full py-3 px-4 bg-primary text-primary-foreground text-center rounded-xl font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: tenant.primaryColor || undefined }}
              >
                Quero assinar
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}