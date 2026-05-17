"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  Phone,
  ShieldCheck,
  User,
  Mail,
  FileText,
} from "lucide-react";

export type TenantInfo = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
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

type Step = "PHONE" | "CODE" | "DETAILS" | "SUCCESS";

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatCycle(cycle: PlanInfo["billingCycle"]) {
  const cycles: Record<PlanInfo["billingCycle"], string> = {
    MONTHLY: "Mensal",
    QUARTERLY: "Trimestral",
    SEMIANNUAL: "Semestral",
    YEARLY: "Anual",
  };

  return cycles[cycle] || cycle;
}

function normalizePhoneInput(value: string) {
  let next = value.replace(/[^\d+]/g, "");

  if (!next.startsWith("+55")) {
    next = "+55" + next.replace(/\D/g, "");
  }

  return next.slice(0, 14);
}

function normalizeDocumentInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 14);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  const [step, setStep] = useState<Step>("PHONE");

  const [phoneE164, setPhoneE164] = useState("+55");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");

  const primaryColor = tenant.primaryColor || "#10b981";

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhoneE164(normalizePhoneInput(e.target.value));
  };

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCpfCnpj(normalizeDocumentInput(e.target.value));
  };

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();

    if (!/^\+55\d{11}$/.test(phoneE164)) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");
      setDevCode("");

      const res = await fetch(`/api/public/${slug}/club/auth/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneE164,
          planId: plan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar o código.");
      }

      if (data.devCode) {
        setDevCode(data.devCode);
      }

      setMessage("Código enviado para o seu WhatsApp.");
      setStep("CODE");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro inesperado."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError("O código deve ter 6 dígitos.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch(`/api/public/${slug}/club/auth/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneE164,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido.");
      }

      setMessage("WhatsApp validado. Agora complete seus dados.");
      setStep("DETAILS");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Código inválido ou expirado."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setError("Informe seu nome.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
      setError("Informe um CPF ou CNPJ válido.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const subscribeRes = await fetch(`/api/public/${slug}/club/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          planId: plan.id,
        }),
      });

      const subscribeData = await subscribeRes.json();

      if (!subscribeRes.ok) {
        throw new Error(subscribeData.error || "Erro ao iniciar assinatura.");
      }

      if (subscribeData?.nextStep === "SUBSCRIPTION_ACTIVE") {
        setMessage("Você já possui uma assinatura ativa deste plano.");
        setStep("SUCCESS");
        return;
      }

      if (subscribeData?.subscription?.checkoutUrl) {
        window.location.assign(subscribeData.subscription.checkoutUrl);
        return;
      }

      const subscriptionId = subscribeData?.subscription?.id;

      if (!subscriptionId) {
        throw new Error("Não foi possível iniciar a assinatura.");
      }

      const checkoutRes = await fetch(
        `/api/public/${slug}/club/subscriptions/${subscriptionId}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cpfCnpj: cleanCpfCnpj,
          }),
        }
      );

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || "Erro ao gerar checkout.");
      }

      if (checkoutData?.checkoutUrl) {
        window.location.assign(checkoutData.checkoutUrl);
        return;
      }

      setMessage(
        "Assinatura iniciada com sucesso. Verifique o status na sua área do clube."
      );
      setStep("SUCCESS");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar assinatura."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white px-4 py-6 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 dark:text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <Link
          href={`/s/${slug}/clube`}
          className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <ArrowLeft size={14} />
          Voltar para o clube
        </Link>

        <section className={`${shellCardClass} overflow-hidden`}>
          <div
            className="h-2 w-full"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="px-6 py-7 sm:px-8">
            <div className="mb-6 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <Crown size={24} />
              </div>

              <div>
                <p className={labelClass}>Assinatura do clube</p>
                <h1 className="text-2xl font-black tracking-tight">
                  Assinar plano
                </h1>
                <p className="text-sm font-medium text-zinc-500">
                  {tenant.name}
                </p>
              </div>
            </div>

            <div className={`${innerCardClass} p-5`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className={labelClass}>Plano selecionado</p>
                  <h2 className="text-xl font-black">{plan.name}</h2>
                  {plan.description && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {plan.description}
                    </p>
                  )}
                </div>

                <div
                  className="rounded-2xl px-4 py-3 text-right text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="text-lg font-black">
                    {formatCurrencyFromCents(plan.priceInCents)}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-white/90">
                    {formatCycle(plan.billingCycle)}
                  </div>
                </div>
              </div>

              {typeof plan.discountPercent === "number" &&
                plan.discountPercent > 0 && (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Benefício incluído: {plan.discountPercent}% de desconto
                  </div>
                )}

              {plan.terms && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Termos
                  </span>
                  {plan.terms}
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {step === "PHONE" && (
          <section className={`${shellCardClass} px-6 py-7 sm:px-8`}>
            <div className="mb-6">
              <p className={labelClass}>Etapa 1</p>
              <h2 className="text-xl font-black">Validar WhatsApp</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Para assinar este plano, confirme seu número de WhatsApp.
              </p>
            </div>

            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label className={`${labelClass} mb-2 block`}>
                  WhatsApp com DDD
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="tel"
                    value={phoneE164}
                    onChange={handlePhoneChange}
                    placeholder="+5511999999999"
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 14px 30px ${primaryColor}33`,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Receber código
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {step === "CODE" && (
          <section className={`${shellCardClass} px-6 py-7 sm:px-8`}>
            <div className="mb-6">
              <p className={labelClass}>Etapa 2</p>
              <h2 className="text-xl font-black">Digite o código</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Enviamos um código de 6 dígitos para {phoneE164}.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className={`${labelClass} mb-2 block`}>
                  Código de verificação
                </label>
                <div className="relative">
                  <ShieldCheck
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="000000"
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              {devCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                  Código de teste: {devCode}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 14px 30px ${primaryColor}33`,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Validar código
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {step === "DETAILS" && (
          <section className={`${shellCardClass} px-6 py-7 sm:px-8`}>
            <div className="mb-6">
              <p className={labelClass}>Etapa 3</p>
              <h2 className="text-xl font-black">Complete seus dados</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Informe seus dados para gerar a assinatura e seguir para o pagamento.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-5">
              <div>
                <label className={`${labelClass} mb-2 block`}>Nome</label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelClass} mb-2 block`}>E-mail</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelClass} mb-2 block`}>
                  CPF ou CNPJ
                </label>
                <div className="relative">
                  <FileText
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpfCnpj}
                    onChange={handleDocumentChange}
                    placeholder="Somente números"
                    className={inputWithIconClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 14px 30px ${primaryColor}33`,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Assinar plano
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {step === "SUCCESS" && (
          <section className={`${shellCardClass} px-6 py-8 text-center sm:px-8`}>
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <CheckCircle2 size={28} />
            </div>

            <h2 className="text-2xl font-black">Tudo certo</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Seu fluxo foi concluído. Você pode acompanhar sua assinatura pela área do clube.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/s/${slug}/clube/minha-assinatura`}
                className="inline-flex h-12 items-center justify-center rounded-2xl px-6 text-xs font-black uppercase tracking-widest text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Ver minha assinatura
              </Link>

              <Link
                href={`/s/${slug}/clube`}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-200 px-6 text-xs font-black uppercase tracking-widest text-zinc-700 dark:border-zinc-800 dark:text-zinc-200"
              >
                Voltar ao clube
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
