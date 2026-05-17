"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Crown,
  CreditCard,
  Phone,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export type TenantInfo = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
};

export type PortalSubscription = {
  id: string;
  status: "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELED" | "EXPIRED";
  provider: "ASAAS" | "MERCADO_PAGO";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  plan: {
    id: string;
    name: string;
    description: string | null;
    terms: string | null;
    priceInCents: number;
    billingCycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
    discountPercent: number | null;
  };
};

export type PortalData = {
  tenant: TenantInfo;
  client: {
    name: string;
    phoneE164: string;
  };
  subscriptions: PortalSubscription[];
};

export type PlanInfo = {
  id: string;
  name: string;
  description: string | null;
  terms: string | null;
  priceInCents: number;
  billingCycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
  discountPercent: number | null;
};

type Props = {
  slug: string;
  tenant: TenantInfo;
  plan: PlanInfo;
};
function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatCycle(cycle: string) {
  const cycles: Record<string, string> = {
    MONTHLY: "Mensal",
    QUARTERLY: "Trimestral",
    SEMIANNUAL: "Semestral",
    YEARLY: "Anual",
  };
  return cycles[cycle] || cycle;
}

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatStatus(status: PortalSubscription["status"]) {
  const labels: Record<PortalSubscription["status"], string> = {
    PENDING: "Pendente",
    ACTIVE: "Ativa",
    OVERDUE: "Inadimplente",
    CANCELED: "Cancelada",
    EXPIRED: "Expirada",
  };
  return labels[status] || status;
}

function statusBadgeClass(status: PortalSubscription["status"]) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-500/15 dark:text-amber-400";
    case "OVERDUE":
      return "border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-500/15 dark:text-red-400";
    case "CANCELED":
    case "EXPIRED":
      return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

function StatusIcon({ status }: { status: PortalSubscription["status"] }) {
  switch (status) {
    case "ACTIVE":
      return <CheckCircle2 size={14} className="mr-1" />;
    case "PENDING":
      return <Clock size={14} className="mr-1" />;
    case "OVERDUE":
      return <AlertCircle size={14} className="mr-1" />;
    case "CANCELED":
    case "EXPIRED":
      return <XCircle size={14} className="mr-1" />;
    default:
      return null;
  }
}

const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-zinc-500";

const shellCardClass =
  "rounded-3xl sm:rounded-[2rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const innerCardClass =
  "rounded-[1.75rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const inputWithIconClass =
  "h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-100 pl-11 pr-4 text-sm font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-950";

export default function SubscribeClubClient({ slug, tenant, plan }: Props) {
  const [step, setStep] = useState<"PHONE" | "CODE" | "PORTAL">("PHONE");
  const [phoneE164, setPhoneE164] = useState("+55");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [portalData, setPortalData] = useState<PortalData | null>(null);

  const primaryColor = tenant.primaryColor || "#10b981";

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d+]/g, "");
    if (!value.startsWith("+55")) {
      value = "+55" + value.replace(/\D/g, "");
    }
    value = value.trim();
    if (value.length <= 14) {
      setPhoneE164(value);
    }
  };

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();

    if (phoneE164.length !== 14) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`/api/public/${slug}/club/portal/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164 }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar o código.");
      }

      setMessage("Código de acesso enviado para o seu WhatsApp.");
      setStep("CODE");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro inesperado."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPortalData = async () => {
    try {
      const res = await fetch(`/api/public/${slug}/club/portal/me`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar os dados.");
      }

      setPortalData(data);
      setStep("PORTAL");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar assinatura."
      );
      setStep("PHONE");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("O código deve ter 6 dígitos.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`/api/public/${slug}/club/portal/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido.");
      }

      await loadPortalData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Código inválido ou expirado."
      );
      setLoading(false);
    }
  };

  const hasActiveSubscription = Boolean(
    portalData?.subscriptions.some((sub) => sub.status === "ACTIVE")
  );

  const clientDisplayName =
    portalData?.client.name?.trim() || portalData?.client.phoneE164 || "Cliente";

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            href={`/s/${slug}/clube`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-black text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-300"
          >
            <ArrowLeft size={16} />
            Voltar para o clube
          </Link>

          <div className={`${shellCardClass} overflow-hidden`}>
            <div className="border-b border-zinc-200 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent px-5 py-6 dark:border-zinc-800 sm:px-8 sm:py-8">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 12px 30px ${primaryColor}33`,
                  }}
                >
                  <Crown size={26} />
                </div>

                <div>
                  <p className={labelClass}>Portal do assinante</p>
                  <h1 className="mt-2 text-[1.75rem] leading-[1.05] font-black italic tracking-tighter text-zinc-900 dark:text-white sm:text-4xl">
                    Minha assinatura
                  </h1>
                  <p className="mt-2 text-[13px] leading-5 font-bold text-zinc-500">
                    {tenant.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {message}
          </div>
        )}

        {step === "PHONE" && (
          <section className={`${shellCardClass} p-5 sm:p-6`}>
            <p className={labelClass}>Acesso por WhatsApp</p>
            <h2 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              Consulte sua assinatura
            </h2>
            <p className="mt-2 text-sm font-bold text-zinc-500">
              Informe seu WhatsApp para consultar os dados da sua assinatura do
              clube.
            </p>

            <form onSubmit={handleSendCode} className="mt-6 space-y-4">
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={18}
                />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={14}
                  value={phoneE164}
                  onChange={handlePhoneChange}
                  placeholder="+5511999998888"
                  className={inputWithIconClass}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 14px 30px ${primaryColor}33`,
                }}
              >
                {loading ? "Processando..." : "Receber código"}
              </button>
            </form>
          </section>
        )}

        {step === "CODE" && (
          <section className={`${shellCardClass} p-5 sm:p-6`}>
            <p className={labelClass}>Validação</p>
            <h2 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              Digite o código
            </h2>
            <p className="mt-2 text-sm font-bold text-zinc-500">
              Enviamos um código de 6 dígitos para o WhatsApp{" "}
              <span className="text-zinc-900 dark:text-white">{phoneE164}</span>.
            </p>

            <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
              <div className="relative">
                <ShieldCheck
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={18}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-100 pl-12 pr-4 text-center text-2xl font-black tracking-[0.45em] text-zinc-900 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-950"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 14px 30px ${primaryColor}33`,
                }}
              >
                {loading ? "Validando..." : "Validar código"}
              </button>
            </form>
          </section>
        )}

        {step === "PORTAL" && portalData && (
          <div className="space-y-5">
            <section className={`${shellCardClass} p-5 sm:p-6`}>
              <p className={labelClass}>Cliente</p>
              <h2 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                {clientDisplayName}
              </h2>
              <p className="mt-2 text-sm font-bold text-zinc-500">
                WhatsApp: {portalData.client.phoneE164}
              </p>
            </section>

            {portalData.subscriptions.length === 0 ? (
              <section className={`${shellCardClass} px-6 py-12 text-center`}>
                <p className="text-sm font-bold text-zinc-500">
                  Você não possui assinaturas vinculadas a este número.
                </p>
                <Link
                  href={`/s/${slug}/clube`}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 14px 30px ${primaryColor}33`,
                  }}
                >
                  Ver planos do clube
                </Link>
              </section>
            ) : (
              <section className="space-y-4">
                <div>
                  <p className={labelClass}>Assinaturas</p>
                  <h3 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                    Suas assinaturas
                  </h3>
                </div>

                {portalData.subscriptions.map((sub) => (
                  <article
                    key={sub.id}
                    className={`${shellCardClass} overflow-hidden`}
                  >
                    <div className="px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className={labelClass}>Plano</p>
                          <h4 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                            {sub.plan.name}
                          </h4>
                          <p className="mt-3 text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                            {formatCurrencyFromCents(sub.plan.priceInCents)}
                            <span className="ml-2 text-sm font-bold not-italic text-zinc-500">
                              /{formatCycle(sub.plan.billingCycle).toLowerCase()}
                            </span>
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center self-start rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(
                            sub.status
                          )}`}
                        >
                          <StatusIcon status={sub.status} />
                          {formatStatus(sub.status)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className={`${innerCardClass} p-4`}>
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                              <CreditCard size={16} />
                            </div>
                            <div>
                              <p className={labelClass}>Gateway</p>
                              <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                                {sub.provider === "MERCADO_PAGO"
                                  ? "Mercado Pago"
                                  : "Asaas"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className={`${innerCardClass} p-4`}>
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-zinc-100 p-2 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              <Calendar size={16} />
                            </div>
                            <div>
                              <p className={labelClass}>Próxima renovação</p>
                              <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                                {formatDateBR(sub.currentPeriodEnd)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {typeof sub.plan.discountPercent === "number" &&
                          sub.plan.discountPercent > 0 && (
                            <div className={`${innerCardClass} p-4 sm:col-span-2`}>
                              <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                                  <Crown size={16} />
                                </div>
                                <div>
                                  <p className={labelClass}>Benefício</p>
                                  <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                                    {sub.plan.discountPercent}% de desconto
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        {sub.status === "CANCELED" && sub.canceledAt && (
                          <div className={`${innerCardClass} p-4 sm:col-span-2`}>
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl bg-red-500/10 p-2 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                                <XCircle size={16} />
                              </div>
                              <div>
                                <p className={labelClass}>Cancelada em</p>
                                <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                                  {formatDateBR(sub.canceledAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {sub.plan.description && (
                        <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-100/80 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                          <p className={labelClass}>Descrição</p>
                          <p className="mt-2 whitespace-pre-line text-sm font-bold text-zinc-500">
                            {sub.plan.description}
                          </p>
                        </div>
                      )}

                      {sub.plan.terms && (
                        <div className="mt-4 rounded-3xl border border-zinc-200 bg-zinc-100/80 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                          <p className={labelClass}>Termos</p>
                          <p className="mt-2 whitespace-pre-line text-sm font-bold text-zinc-500">
                            {sub.plan.terms}
                          </p>
                        </div>
                      )}
                    </div>

                    {sub.status === "ACTIVE" && (
                      <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/60 sm:px-6">
                        <Link
                          href={`/s/${slug}`}
                          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95"
                          style={{
                            backgroundColor: primaryColor,
                            boxShadow: `0 14px 30px ${primaryColor}33`,
                          }}
                        >
                          <CalendarPlus size={16} />
                          Agendar usando benefício
                        </Link>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}

            {!hasActiveSubscription && portalData.subscriptions.length > 0 && (
              <section className={`${shellCardClass} px-6 py-8 text-center`}>
                <p className="text-sm font-bold text-zinc-500">
                  Você não possui assinatura ativa no momento.
                </p>
                <Link
                  href={`/s/${slug}/clube`}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 14px 30px ${primaryColor}33`,
                  }}
                >
                  <Crown size={16} />
                  Ver planos
                </Link>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
