"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  Crown, 
  Calendar, 
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  CalendarPlus
} from "lucide-react";

export type TenantInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
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

type Props = {
  slug: string;
  tenant: TenantInfo;
};

// Helpers
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
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    case "PENDING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    case "OVERDUE":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "CANCELED":
    case "EXPIRED":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
    default:
      return "bg-zinc-100 text-zinc-700";
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

export default function ClubPortalClient({ slug, tenant }: Props) {
  const [step, setStep] = useState<"PHONE" | "CODE" | "PORTAL">("PHONE");
  const [phoneE164, setPhoneE164] = useState("+55");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [portalData, setPortalData] = useState<PortalData | null>(null);

  const primaryColor = tenant.primaryColor || "#18181b"; // zinc-900 fallback

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d+]/g, "");
    if (!value.startsWith("+55")) {
      value = "+55" + value.replace(/\D/g, "");
    }
    value = value.trim();
    if (value.length <= 14) {
      setPhoneE164(value);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneE164.length !== 14) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");
      setDevCode("");

      const res = await fetch(`/api/public/${slug}/club/portal/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164 }),
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
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
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
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
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
      setError(err instanceof Error ? err.message : "Falha ao carregar assinatura.");
      setStep("PHONE");
    } finally {
      setLoading(false);
    }
  };

  const hasActiveSubscription = portalData?.subscriptions.some(s => s.status === "ACTIVE");

  return (
    <div className="mx-auto max-w-xl p-4 pt-8 md:pt-12 min-h-screen">
      
      {/* Cabeçalho */}
      <div className="mb-8">
        <Link 
          href={`/s/${slug}/clube`}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Voltar para o clube
        </Link>
        <div className="flex items-center gap-4">
          <div 
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <Crown size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Minha Assinatura
            </h1>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {tenant.name}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          🚨 {error}
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          ✅ {message}
        </div>
      )}

      {/* Fluxo de Autenticação */}
      {step === "PHONE" && (
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none animate-in fade-in slide-in-from-bottom-4">
          <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">Acesse seu portal</h2>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            Informe seu WhatsApp para consultar os dados da sua assinatura do clube.
          </p>
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={14}
                value={phoneE164}
                onChange={handlePhoneChange}
                placeholder="+5511999998888"
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-4 pl-12 pr-4 text-sm font-bold text-zinc-900 outline-none transition-all focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                style={{ outlineColor: primaryColor }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "Processando..." : "Receber código"}
            </button>
          </form>
        </div>
      )}

      {step === "CODE" && (
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none animate-in fade-in slide-in-from-bottom-4">
          <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">Digite o código</h2>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            Enviamos um código de 6 dígitos para o WhatsApp <strong>{phoneE164}</strong>.
          </p>
          {devCode && process.env.NODE_ENV !== "production" && (
            <p className="mb-4 text-xs font-mono text-zinc-500">Código de teste: {devCode}</p>
          )}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-4 pl-12 pr-4 text-center text-2xl tracking-[0.5em] font-black text-zinc-900 outline-none transition-all focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                style={{ outlineColor: primaryColor }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "Validando..." : "Validar código"}
            </button>
          </form>
        </div>
      )}

      {/* Dados do Portal */}
      {step === "PORTAL" && portalData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">Olá, {portalData.client.name}</h2>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              WhatsApp: {portalData.client.phoneE164}
            </p>
          </div>

          {portalData.subscriptions.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 border-2 border-dashed">
              <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-4">Você não possui assinaturas vinculadas a este número.</p>
              <Link 
                href={`/s/${slug}/clube`}
                className="inline-flex rounded-xl py-3 px-6 text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Ver planos do clube
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 px-2">Suas Assinaturas</h3>
              
              {portalData.subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-3xl bg-white overflow-hidden shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none flex flex-col">
                  <div className="p-6 pb-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-none">{sub.plan.name}</h4>
                        <p className="text-2xl font-black mt-2 text-zinc-900 dark:text-zinc-100">
                          {formatCurrencyFromCents(sub.plan.priceInCents)}
                          <span className="text-xs font-medium text-zinc-500">/{formatCycle(sub.plan.billingCycle).toLowerCase()}</span>
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadgeClass(sub.status)}`}>
                        <StatusIcon status={sub.status} /> {formatStatus(sub.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mt-6 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                      {sub.plan.discountPercent && (
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <span className="flex items-center gap-2"><Crown size={16} className="text-amber-500" /> Benefício</span>
                          <span className="font-bold text-amber-600 dark:text-amber-500">{sub.plan.discountPercent}% de desconto</span>
                        </div>
                      )}
                      {sub.currentPeriodEnd && (
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                          <span className="flex items-center gap-2"><Calendar size={16} /> Próxima renovação</span>
                          <span className="font-bold">{formatDateBR(sub.currentPeriodEnd)}</span>
                        </div>
                      )}
                      {sub.status === "CANCELED" && sub.canceledAt && (
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 text-red-500">
                          <span className="flex items-center gap-2"><XCircle size={16} /> Cancelada em</span>
                          <span className="font-bold">{formatDateBR(sub.canceledAt)}</span>
                        </div>
                      )}
                    </div>

                    {sub.plan.description && (
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 whitespace-pre-line">{sub.plan.description}</p>
                      </div>
                    )}
                  </div>
                  
                  {sub.status === "ACTIVE" && (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
                      <Link 
                        href={`/s/${slug}`}
                        className="flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <CalendarPlus size={16} /> Agendar usando benefício
                      </Link>
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}

          {!hasActiveSubscription && portalData.subscriptions.length > 0 && (
            <div className="text-center pt-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                Você não possui assinatura ativa no momento.
              </p>
              <Link 
                href={`/s/${slug}/clube`}
                className="inline-flex items-center gap-2 rounded-xl py-3 px-6 text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Crown size={16} /> Ver planos
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}