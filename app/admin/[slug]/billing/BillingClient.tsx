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
  planTier?: string | null;
  planCycle?: string | null;
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

function formatCpfCnpj(val: string) {
  const clean = val.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return val;
}

export default function BillingClient({ slug }: { slug: string }) {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [saving, setSaving] = useState(false);

  // Estados do seletor de planos
  const [selectedTier, setSelectedTier] = useState<"BASICO" | "ESSENCIAL" | "PRO">("PRO");
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

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

      // Preencher o plano selecionado inicialmente com o plano atual do salão
      const currentTier = json.tenant.planTier;
      if (currentTier === "BASICO" || currentTier === "ESSENCIAL" || currentTier === "PRO") {
        setSelectedTier(currentTier);
      }
      const currentCycle = json.tenant.planCycle;
      if (currentCycle === "MONTHLY" || currentCycle === "YEARLY") {
        setSelectedCycle(currentCycle);
      }
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

  async function handleCheckout(tier: "BASICO" | "ESSENCIAL" | "PRO", cycle: "MONTHLY" | "YEARLY") {
    if (!data?.tenant.cpfCnpj && !cpfCnpj) {
      setErrorMessage("Por favor, preencha e salve seu CPF ou CNPJ antes de prosseguir com o pagamento.");
      // Rolagem suave até a seção do CPF
      document.getElementById("billing-data-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    try {
      setStartingCheckout(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier, planCycle: cycle }),
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

  const plans = [
    {
      tier: "BASICO" as const,
      name: "Trato Básico",
      description: "Ideal para profissionais autônomos ou salões individuais iniciando no digital.",
      monthlyPrice: 39.90,
      yearlyPrice: 390.00,
      features: [
        "1 barbeiro ativo",
        "Notificações automáticas de WhatsApp",
        "Agendamento online ilimitado",
        "Link de agendamento personalizado",
        "Gestão de horários e bloqueios",
      ],
      notIncluded: [
        "Controle de estoque de produtos",
        "Reserva de produtos por clientes",
        "Clube de assinaturas (VIP)",
      ]
    },
    {
      tier: "ESSENCIAL" as const,
      name: "Trato Essencial",
      description: "Para salões em crescimento que precisam de mais profissionais e controle total.",
      monthlyPrice: 49.90,
      yearlyPrice: 490.00,
      popular: true,
      features: [
        "Até 3 barbeiros ativos",
        "Notificações automáticas de WhatsApp",
        "Controle de estoque de produtos",
        "Reserva de produtos por clientes",
        "Clube de assinaturas (VIP)",
        "Agendamento online ilimitado",
        "Link de agendamento personalizado",
        "Gestão de horários e bloqueios",
      ],
      notIncluded: []
    },
    {
      tier: "PRO" as const,
      name: "Trato Pro",
      description: "A experiência premium completa para barbearias consolidadas dominarem o mercado.",
      monthlyPrice: 59.90,
      yearlyPrice: 590.00,
      features: [
        "Até 5 barbeiros ativos",
        "Notificações automáticas de WhatsApp",
        "Controle de estoque de produtos",
        "Reserva de produtos por clientes",
        "Clube de assinaturas (VIP)",
        "Agendamento online ilimitado",
        "Link de agendamento personalizado",
        "Gestão de horários e bloqueios",
        "Suporte prioritário via WhatsApp",
      ],
      notIncluded: []
    }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-emerald-600 dark:text-emerald-400">
            TratoMarcado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            Planos e Assinatura
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Gerencie o plano da sua barbearia e escolha a melhor opção para seu negócio.
          </p>
        </div>

        <a
          href={`/admin/${slug}`}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition self-start md:self-auto"
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
          {/* Status Atual */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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
                      Plano Atual:
                    </span>{" "}
                    {data.tenant.planTier === "BASICO" ? "Trato Básico" : data.tenant.planTier === "ESSENCIAL" ? "Trato Essencial" : "Trato Pro"} ({data.tenant.planCycle === "YEARLY" ? "Anual" : "Mensal"})
                  </p>
                  
                  <p>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Acesso ao Sistema:
                    </span>{" "}
                    {data.billingActive ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Liberado</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-bold">Bloqueado</span>
                    )}
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

              {/* Dados de Faturamento */}
              <div id="billing-data-section" className="w-full md:max-w-md p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold mb-2 text-zinc-900 dark:text-white">Dados de Faturamento</h3>
                <p className="text-xs text-zinc-500 mb-4">Seu CPF ou CNPJ para emissão de faturas com o Asaas.</p>
                {data.tenant.cpfCnpj ? (
                  <div className="flex items-center justify-between h-11 px-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase">
                      Documento: {formatCpfCnpj(data.tenant.cpfCnpj)}
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border border-emerald-500/20">
                      Salvo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm text-zinc-900 dark:text-white font-bold"
                      placeholder="000.000.000-00 ou CNPJ"
                      value={cpfCnpj}
                      onChange={e => setCpfCnpj(e.target.value)}
                    />
                    <button
                      onClick={handleSaveData}
                      disabled={saving || cpfCnpj.length < 11}
                      className="w-full sm:w-auto h-11 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-550 text-white rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center text-sm"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Comparativo de Planos */}
          <section className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Escolha o seu plano</h2>
              <p className="text-sm text-zinc-500 mt-2">Encontre a escala perfeita para os barbeiros e ferramentas da sua unidade.</p>

              {/* Seletor Mensal / Anual */}
              <div className="mt-6 inline-flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedCycle("MONTHLY")}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                    selectedCycle === "MONTHLY"
                      ? "bg-white text-zinc-950 shadow"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle("YEARLY")}
                  className={`relative px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                    selectedCycle === "YEARLY"
                      ? "bg-white text-zinc-950 shadow"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Anual
                  <span className="bg-emerald-500 text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-normal shrink-0">
                    Salvar ~18%
                  </span>
                </button>
              </div>
            </div>

            {/* Grid dos Planos */}
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((p) => {
                const isCurrent = data.tenant.planTier === p.tier && data.tenant.planCycle === selectedCycle && data.tenant.planStatus === "ACTIVE";
                const isSelected = selectedTier === p.tier;
                const price = selectedCycle === "YEARLY" ? p.yearlyPrice : p.monthlyPrice;
                const priceLabel = selectedCycle === "YEARLY" ? `/ano` : `/mês`;
                const equivalentMonthly = selectedCycle === "YEARLY" ? `R$ ${(p.yearlyPrice / 12).toFixed(2)}/mês equivalente` : null;

                return (
                  <div
                    key={p.tier}
                    onClick={() => {
                      if (!isCurrent) setSelectedTier(p.tier);
                    }}
                    className={`relative rounded-3xl border p-6 flex flex-col justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? "border-emerald-500 bg-white dark:bg-zinc-900 ring-2 ring-emerald-500/20 shadow-md scale-[1.01]"
                        : p.popular
                        ? "border-emerald-500/30 bg-zinc-50 dark:bg-zinc-900/80 shadow-md scale-[1.01] hover:border-emerald-500/50"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight italic">
                            {p.name}
                          </h3>
                          {isCurrent && (
                            <span className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
                              Ativo
                            </span>
                          )}
                          {p.popular && !isCurrent && (
                            <span className="bg-emerald-500 text-zinc-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-normal font-medium h-10">
                          {p.description}
                        </p>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-zinc-900 dark:text-white">
                            R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-zinc-550 dark:text-zinc-450 font-bold uppercase tracking-wider">{priceLabel}</span>
                        </div>
                        {equivalentMonthly && (
                          <p className="text-[10px] text-emerald-505 dark:text-emerald-400 font-bold mt-0.5">{equivalentMonthly}</p>
                        )}
                      </div>

                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 mb-6">
                        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Benefícios Inclusos</p>
                        <ul className="space-y-3">
                          {p.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 font-bold">
                              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                          {p.notIncluded.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-400 dark:text-zinc-650 font-medium opacity-60">
                              <Check className="h-4 w-4 text-zinc-300 dark:text-zinc-800 shrink-0 mt-0.5" />
                              <span className="line-through">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={startingCheckout || isCurrent}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckout(p.tier, selectedCycle);
                      }}
                      className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isCurrent
                          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/30 cursor-not-allowed"
                          : p.popular
                          ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
                          : "bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-900 dark:hover:bg-zinc-700 text-white active:scale-[0.98] border border-zinc-800 dark:border-zinc-700"
                      }`}
                    >
                      {startingCheckout && isSelected ? (
                        <span className="flex items-center justify-center gap-2">
                          Gerando fatura...
                        </span>
                      ) : isCurrent ? (
                        "Plano Atual"
                      ) : data.tenant.planStatus === "ACTIVE" ? (
                        "Mudar de Plano"
                      ) : (
                        "Assinar agora"
                      )}
                    </button>
                  </div>
                );
              })}
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