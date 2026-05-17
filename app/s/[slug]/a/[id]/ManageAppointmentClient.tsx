"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BadgePercent,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Crown,
  MapPin,
  Printer,
  RefreshCcw,
  Scissors,
  User,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

type AppointmentData = {
  id: string;
  startAt: string;
  status: string;
  tenant: { name: string; primaryColor?: string };
  service: { name: string; price: number };
  professional: { name: string };
  client?: {
    name?: string | null;
    phoneE164?: string | null;
  } | null;
  clubSubscriptionId?: string | null;
  clubPlanName?: string | null;
  clubOriginalPrice?: number | null;
  clubDiscountAmount?: number | null;
  clubFinalPrice?: number | null;
};

function formatCurrencyFromCents(valueInCents: number | null | undefined) {
  const value = typeof valueInCents === "number" ? valueInCents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-zinc-500";

const shellCardClass =
  "rounded-3xl sm:rounded-[2rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const innerCardClass =
  "rounded-[1.75rem] border border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950";

export default function ManageAppointmentClient({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const TZ = "America/Sao_Paulo";

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAppointment = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${slug}/appointments/${id}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.appointment);
    } finally {
      setLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    if (slug && id) {
      loadAppointment();
    }
  }, [slug, id, loadAppointment]);

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar este horário? O barbeiro será avisado."
    );
    if (!confirmed) return;

    setIsCancelling(true);

    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      });

      if (res.ok) {
        await loadAppointment();
        window.alert("Agendamento cancelado com sucesso.");
      } else {
        window.alert("Erro ao cancelar o agendamento. Tente novamente.");
      }
    } catch {
      window.alert("Erro ao cancelar o agendamento. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="relative min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950">
        <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
          <div className="h-10 w-10 rounded-full border-4 border-zinc-200 border-t-emerald-500 animate-spin dark:border-zinc-800" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">
            Buscando ticket...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relative min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950">
        <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="relative flex min-h-[100dvh] items-center justify-center p-6">
          <div className={`${shellCardClass} w-full max-w-sm p-8 text-center`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-950">
              <AlertCircle className="h-8 w-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              Putz, não achamos!
            </h2>
            <p className="mt-2 text-sm font-bold text-zinc-500">
              Este agendamento não existe ou o link pode estar quebrado.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCanceled = data.status === "CANCELED";
  const primaryColor = data.tenant?.primaryColor || "#10b981";

  const hasClubReference = Boolean(data.clubSubscriptionId || data.clubPlanName);

  const usedIncludedBenefit =
    hasClubReference &&
    typeof data.clubOriginalPrice === "number" &&
    typeof data.clubDiscountAmount === "number" &&
    typeof data.clubFinalPrice === "number" &&
    data.clubOriginalPrice > 0 &&
    data.clubDiscountAmount === data.clubOriginalPrice &&
    data.clubFinalPrice === 0;

  const usedClubPercentDiscount =
    hasClubReference &&
    typeof data.clubDiscountAmount === "number" &&
    typeof data.clubFinalPrice === "number" &&
    data.clubDiscountAmount > 0 &&
    data.clubFinalPrice > 0;

  const clubValidatedButNoAppliedBenefit =
    hasClubReference && !usedIncludedBenefit && !usedClubPercentDiscount;

  const finalPriceToDisplay = hasClubReference
    ? (data.clubFinalPrice ?? data.service?.price)
    : data.service?.price;

  const clientDisplayName =
    data.client?.name?.trim() || data.client?.phoneE164 || "Cliente";

  return (
    <div className="relative min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950">
      <div
        className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 blur-[120px] pointer-events-none"
        style={{
          background: isCanceled
            ? "rgba(239,68,68,0.06)"
            : `${primaryColor}14`,
        }}
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-xl ${
              isCanceled
                ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/30"
                : "border-emerald-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
            style={
              !isCanceled
                ? { boxShadow: `0 16px 40px ${primaryColor}25` }
                : undefined
            }
          >
            {isCanceled ? (
              <XCircle className="h-8 w-8" />
            ) : (
              <CheckCircle2
                className="h-8 w-8"
                style={{ color: primaryColor }}
              />
            )}
          </div>

          <p className={labelClass}>Status do horário</p>
          <h1
            className={`mt-2 text-3xl font-black italic tracking-tighter ${
              isCanceled ? "text-red-500" : "text-zinc-900 dark:text-white"
            }`}
          >
            {isCanceled ? "Cancelado" : "Confirmado"}
          </h1>
        </div>

        <div
          className={`${shellCardClass} relative overflow-hidden ${
            isCanceled ? "opacity-75" : ""
          }`}
        >
          <div className="absolute left-0 top-[104px] -translate-y-1/2 h-8 w-4 rounded-r-full border-y border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950" />
          <div className="absolute right-0 top-[104px] -translate-y-1/2 h-8 w-4 rounded-l-full border-y border-l border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950" />

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-dashed border-zinc-200 pb-5 dark:border-zinc-800">
              <div className="max-w-[72%]">
                <p className={labelClass}>Barbearia</p>
                <h2 className="mt-2 truncate text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                  {data.tenant?.name}
                </h2>
                <p className="mt-1 truncate text-sm font-bold text-zinc-500">
                  {clientDisplayName}
                </p>
              </div>

              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <MapPin size={12} />
                  Presencial
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Data</p>
                </div>
                <p className="font-bold text-sm text-white" suppressHydrationWarning>
                  {formatInTimeZone(new Date(data.startAt), TZ, "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>

              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Horário</p>
                </div>
                <p className="font-bold text-sm text-white" suppressHydrationWarning>
                  {formatInTimeZone(new Date(data.startAt), TZ, "HH:mm")}
                </p>
              </div>

              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Scissors className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Serviço</p>
                </div>
                <p className="font-bold text-sm text-white truncate">{data.service?.name}</p>
              </div>

              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <User className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Profissional</p>
                </div>
                <p className="font-bold text-sm text-white truncate">{data.professional?.name}</p>
              </div>
            </div>

            {hasClubReference && (
              <div className="mt-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    {usedIncludedBenefit && "Benefício incluso utilizado"}
                    {usedClubPercentDiscount && "Desconto do clube aplicado"}
                    {clubValidatedButNoAppliedBenefit &&
                      "Assinatura do clube identificada"}
                  </span>
                </div>

                <div className="space-y-3">
                  {data.clubPlanName && (
                    <div>
                      <p className={labelClass}>Plano</p>
                      <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                        {data.clubPlanName}
                      </p>
                    </div>
                  )}

                  {(usedIncludedBenefit || usedClubPercentDiscount) && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <p className={labelClass}>Original</p>
                        <p className="mt-1 text-xs font-bold text-zinc-500 line-through">
                          {formatCurrencyFromCents(data.clubOriginalPrice)}
                        </p>
                      </div>

                      <div>
                        <p className={labelClass}>Desconto</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                          <BadgePercent size={11} />
                          -{formatCurrencyFromCents(data.clubDiscountAmount)}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <p className={labelClass}>Valor final</p>
                        <p className="mt-1 text-sm font-black italic text-amber-600 dark:text-amber-400">
                          {formatCurrencyFromCents(data.clubFinalPrice)}
                        </p>
                      </div>
                    </div>
                  )}

                  {clubValidatedButNoAppliedBenefit && (
                    <p className="text-xs font-bold text-zinc-500">
                      Este agendamento seguiu sem benefício aplicado.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-end justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <div>
                <p className={labelClass}>Total a pagar</p>
                <p className="mt-1 text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                  {formatCurrencyFromCents(finalPriceToDisplay)}
                </p>
              </div>

              <span className="rounded-xl bg-zinc-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-zinc-900">
                No local
              </span>
            </div>
          </div>

          <div className="border-t border-zinc-200 bg-zinc-100/70 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            {!isCanceled && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => router.push(`/s/${slug}`)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Novo
                </button>

                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-100 active:scale-95 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {isCancelling ? "..." : "Cancelar"}
                </button>
              </div>
            )}

            <button
              onClick={() =>
                isCanceled ? router.push(`/s/${slug}`) : window.print()
              }
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg"
              style={{
                backgroundColor: isCanceled ? "#18181b" : primaryColor,
                boxShadow: isCanceled
                  ? undefined
                  : `0 16px 32px ${primaryColor}30`,
              }}
            >
              {isCanceled ? (
                <>
                  <CalendarPlus className="h-4 w-4" />
                  Verificar nova data
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Imprimir / Salvar
                </>
              )}
            </button>
          </div>
        </div>

        {!isCanceled && (
          <p className="mt-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Um print desta tela serve como comprovante.
          </p>
        )}
      </div>
    </div>
  );
}
