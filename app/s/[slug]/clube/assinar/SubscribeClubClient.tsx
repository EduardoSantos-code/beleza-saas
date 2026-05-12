"use client";

import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Smartphone } from "lucide-react";
import Link from "next/link";

type TenantInfo = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
};

type PlanInfo = {
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

const formatCurrency = (cents: number) => {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatCycle = (cycle: string) => {
  const map: Record<string, string> = {
    MONTHLY: "Mensal",
    QUARTERLY: "Trimestral",
    SEMIANNUAL: "Semestral",
    YEARLY: "Anual",
  };
  return map[cycle] || cycle;
};

const sanitizePhone = (val: string) => {
  return val.replace(/[^\d+]/g, "");
};

export default function SubscribeClubClient({ slug, tenant, plan }: Props) {
  const [step, setStep] = useState<"FORM" | "CODE" | "VERIFIED">("FORM");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+55");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Por favor, insira seu nome completo.");
      return;
    }

    const phoneRegex = /^\+55\d{11}$/;
    if (!phoneRegex.test(phone)) {
      setError("WhatsApp inválido. Use o formato +55 DDD + Número.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/public/${slug}/club/auth/send-code`, {
        method: "POST",
        body: JSON.stringify({ phoneE164: phone, planId: plan.id, name }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao enviar código.");

      if (data.devCode) setDevCode(data.devCode);
      setStep("CODE");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("O código deve ter 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/public/${slug}/club/auth/verify-code`, {
        method: "POST",
        body: JSON.stringify({ phoneE164: phone, code }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Código inválido.");

      setStep("VERIFIED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryBg = tenant.primaryColor || "#000";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-10">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <Link href={`/s/${slug}/clube`} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-tight">Assinar Clube</h1>
          <p className="text-xs text-zinc-500">{tenant.name}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Plan Summary Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border dark:border-zinc-800">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              {formatCycle(plan.billingCycle)}
            </span>
          </div>
          <div className="text-2xl font-black mb-1" style={{ color: primaryBg }}>
            {formatCurrency(plan.priceInCents)}
          </div>
          {plan.discountPercent && (
            <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-3">
              {plan.discountPercent}% de desconto incluso
            </p>
          )}
          {plan.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{plan.description}</p>
          )}
          {plan.terms && (
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider border-t dark:border-zinc-800 pt-3">
              Condições: {plan.terms}
            </div>
          )}
        </div>

        {/* Step 1: Form */}
        {step === "FORM" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu Nome</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full p-3 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 outline-none"
                style={{ "--tw-ring-color": primaryBg } as any}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp</label>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={14}
                value={phone}
                onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                className="w-full p-3 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 outline-none"
                style={{ "--tw-ring-color": primaryBg } as any}
              />
              <p className="text-[10px] text-zinc-500">Formato: +5511999999999</p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
              style={{ backgroundColor: primaryBg }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Receber código no WhatsApp"}
            </button>
          </form>
        )}

        {/* Step 2: Code Verification */}
        {step === "CODE" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold">Verifique seu WhatsApp</h3>
              <p className="text-sm text-zinc-500">Enviamos um código de 6 dígitos para {phone}</p>
            </div>
            <input
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full p-4 text-center text-2xl tracking-[1em] font-mono rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 outline-none"
              style={{ "--tw-ring-color": primaryBg } as any}
            />
            {devCode && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400 text-center">
                Código de teste: <strong>{devCode}</strong>
              </div>
            )}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
              style={{ backgroundColor: primaryBg }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Validar código"}
            </button>
            <button type="button" onClick={() => setStep("FORM")} className="w-full text-sm text-zinc-500">
              Alterar número
            </button>
          </form>
        )}

        {/* Step 3: Verified */}
        {step === "VERIFIED" && (
          <div className="text-center space-y-6 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold">WhatsApp verificado!</h3>
              <p className="text-zinc-500">Na próxima etapa, você será direcionado para o pagamento.</p>
            </div>
            <button disabled className="w-full py-4 rounded-xl font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
              Pagamento em breve
            </button>
          </div>
        )}
      </main>
    </div>
  );
}