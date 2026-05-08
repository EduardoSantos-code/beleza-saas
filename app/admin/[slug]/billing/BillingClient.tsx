"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

type TenantBilling = {
  id: string;
  name: string;
  slug: string;
  planStatus: string;
  trialEndsAt: string | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  cpfCnpj?: string | null;
};

type BillingResponse = {
  tenant: TenantBilling;
  billingActive: boolean;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "TRIAL":
      return "Em Teste Grátis";
    case "ACTIVE":
      return "Assinatura Ativa";
    case "OVERDUE":
      return "Pagamento Atrasado";
    case "EXPIRED":
      return "Expirada / Cancelada";
    default:
      return status || "Sem assinatura";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400";
    case "TRIAL":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400";
    case "OVERDUE":
      return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "EXPIRED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300";
  }
}

export default function BillingClient({ slug }: { slug: string }) {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [saving, setSaving] = useState(false);

  const trialDaysLeft = useMemo(() => {
    if (!data?.tenant.trialEndsAt) return null;
    const diff = new Date(data.tenant.trialEndsAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [data]);

  async function loadBilling() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/billing`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar assinatura");

      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao carregar assinatura");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();

    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccessMessage("Fatura gerada! A assinatura será ativada assim que o pagamento for confirmado.");
    }
  }, [slug]);

  useEffect(() => {
    if (data?.tenant.cpfCnpj) {
      setCpfCnpj(data.tenant.cpfCnpj);
    }
  }, [data]);

  async function handleSaveData() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/${slug}/billing/update-data`, {
        method: "POST",
        body: JSON.stringify({ cpfCnpj }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      await loadBilling(); // Recarrega os dados para liberar o botão de checkout
    } catch (err) {
      setErrorMessage("Erro ao salvar CPF/CNPJ");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckout() {
    try {
      setStartingCheckout(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/billing/checkout`, {
        method: "POST",
      });

      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json?.error || "Erro ao gerar cobrança");

      // Redireciona para o link de pagamento do Asaas (Pix/Boleto/Cartão)
      window.location.href = json.url;
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao gerar cobrança");
    } finally {
      setStartingCheckout(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-emerald-600 dark:text-emerald-400">
            TratoMarcado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            Assinatura
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Gerencie o plano da sua barbearia.
          </p>
        </div>

        <a
          href={`/admin/${slug}`}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
        >
          Voltar para agenda
        </a>
      </div>

      {errorMessage && (
        <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      {loading ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400 animate-pulse">Carregando plano...</p>
        </section>
      ) : data ? (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  {data.tenant.name}
                </h2>

                <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-widest ${statusClass(data.tenant.planStatus)}`}>
                  {statusLabel(data.tenant.planStatus)}
                </div>

                <div className="mt-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Sistema Liberado:
                    </span>{" "}
                    {data.billingActive ? "Sim" : "Não"}
                  </p>

                  {data.tenant.trialEndsAt && data.tenant.planStatus === "TRIAL" && (
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        Teste Grátis termina em:
                      </span>{" "}
                      {new Date(data.tenant.trialEndsAt).toLocaleDateString("pt-BR")}
                      {trialDaysLeft !== null && ` (${trialDaysLeft} dias restantes)`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {!data.tenant.cpfCnpj && data.tenant.planStatus !== "ACTIVE" ? (
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold mb-2">Dados de Faturamento</h3>
                    <p className="text-sm text-zinc-500 mb-4">Precisamos do seu CPF ou CNPJ para gerar as faturas.</p>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
                        placeholder="000.000.000-00"
                        value={cpfCnpj}
                        onChange={e => setCpfCnpj(e.target.value)}
                      />
                      <button
                        onClick={handleSaveData}
                        disabled={saving || cpfCnpj.length < 11}
                        className="px-6 bg-zinc-900 dark:bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
                      >
                        {saving ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={startingCheckout || data.tenant.planStatus === "ACTIVE"}
                    className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {startingCheckout ? "Gerando fatura..." : 
                     data.tenant.planStatus === "ACTIVE" ? "Plano Ativo" : "Pagar Assinatura"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="max-w-3xl">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Plano de Assinatura
              </h3>
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
                <div className="mb-6">
                  <span className="text-emerald-600 dark:text-emerald-500 font-bold text-xs uppercase tracking-widest">
                    Plano Selecionado
                  </span>
                  <h2 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white mt-2">
                    Trato <span className="text-emerald-500">Pro</span>
                  </h2>
                  <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed font-medium">
                      Sua barbearia no automático com agendamentos ilimitados e notificações via WhatsApp. Tudo o que você precisa para crescer.
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">R$ 39</span>
                  <span className="text-zinc-500 dark:text-zinc-500 font-bold">/mês</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    "Agendamento online ilimitado",
                    "Notificações automáticas via WhatsApp",
                    "Gestão de horários e bloqueios",
                    "Personalização com sua Logo e Banner",
                    "Aceite Pix, Cartão ou Boleto"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 text-sm font-bold">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-red-600 dark:text-red-400 font-bold">Não foi possível carregar a assinatura.</p>
        </section>
      )}
    </div>
  );
}