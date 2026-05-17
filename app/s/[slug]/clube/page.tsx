import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Star,
  Scissors,
  Zap,
  ChevronRight,
} from "lucide-react";

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

const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-zinc-500";

const shellCardClass =
  "rounded-[2.5rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const innerCardClass =
  "rounded-3xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50";

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
  }
  });

  const isClubAvailable = tenant.clubEnabled && plans.length > 0;
  const primaryColor = tenant.primaryColor || "#10b981";

  if (!isClubAvailable) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center dark:bg-zinc-950">
        <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="relative">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-zinc-400" />
          <h1 className="mb-2 text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
            Clube indisponível
          </h1>
          <p className="mx-auto mb-8 max-w-xs text-sm font-bold text-zinc-500">
            Esta barbearia ainda não possui planos ativos no momento.
          </p>
          <Link
            href={`/s/${slug}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90 active:scale-95"
          >
            <ArrowLeft size={16} /> Voltar para agendamento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 selection:bg-emerald-500/30 dark:bg-zinc-950">
      <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/s/${slug}`}
              className="p-2 -ml-2 text-zinc-500 transition-colors hover:text-emerald-500"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h2 className="text-sm font-black italic leading-none tracking-tighter text-zinc-900 dark:text-white">
                {tenant.name}
              </h2>
              <p className={labelClass}>Clube de Assinaturas</p>
            </div>
          </div>
          <Link
            href={`/s/${slug}/clube/minha-assinatura`}
            className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-all hover:bg-emerald-500 hover:text-white active:scale-95 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <ShieldCheck size={14} /> Portal do Assinante
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-6 pt-12">
        <div className="mb-12 text-center">
          <div
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 12px 30px ${primaryColor}33`,
            }}
          >
            <Crown size={32} />
          </div>
          <h1 className="mb-4 text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white md:text-5xl">
            Escolha seu Plano
          </h1>
          <p className="mx-auto max-w-md text-sm font-bold leading-relaxed text-zinc-500">
            Assine um de nossos planos exclusivos e garanta benefícios
            recorrentes, descontos e prioridade em seus agendamentos.
          </p>
        </div>

        <div className="grid gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`${shellCardClass} group relative p-8 md:p-10`}>
              {plan.discountPercent && (
                <div className="absolute top-6 right-6 flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
                  <Zap size={12} fill="currentColor" /> {plan.discountPercent}% OFF
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-3xl font-black italic leading-none tracking-tighter text-zinc-900 transition-colors group-hover:text-emerald-500 dark:text-white">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
                    {formatPrice(plan.priceInCents)}
                  </span>
                  <span className={labelClass}>
                    /{translateBillingCycle(plan.billingCycle)}
                  </span>
                </div>
              </div>

              <div className="mb-10 grid gap-4 md:grid-cols-2">
                {plan.discountPercent && (
                  <div className={innerCardClass}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <Star size={18} />
                      </div>
                      <div>
                        <p className={labelClass}>Desconto Fixo</p>
                        <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                          {plan.discountPercent}% em todos os serviços
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {plan.includedUsesPerPeriod > 0 && (
                  <div className={innerCardClass}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <Scissors size={18} />
                      </div>
                      <div>
                        <p className={labelClass}>Benefício Incluso</p>
                        <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                          {plan.includedUsesPerPeriod}x serviços por ciclo
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {plan.description && (
                  <div className="space-y-2">
                    <p className={labelClass}>O que está incluso</p>
                    <p className="whitespace-pre-line text-sm font-bold leading-relaxed text-zinc-500">
                      {plan.description}
                    </p>
                  </div>
                )}

                {plan.terms && (
                  <div className="space-y-3">
                    <p className={labelClass}>Regras e Termos</p>
                    <div className="flex items-start gap-3 text-sm font-bold text-zinc-600 dark:text-zinc-400">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="leading-tight">{plan.terms}</span>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href={`/s/${slug}/clube/assinar?planId=${encodeURIComponent(
                  plan.id
                )}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-5 px-8 text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 14px 30px ${primaryColor}33`,
                }}
              >
                Quero assinar
                <ChevronRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}