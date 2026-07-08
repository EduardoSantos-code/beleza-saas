"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BadgePercent,
  Ban,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  History,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

type ClubTenant = {
  id: string;
  name: string;
  slug: string;
  clubEnabled: boolean;
  clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
  planTier?: string | null;
};

type ClubPlan = {
  id: string;
  name: string;
  description: string | null;
  terms: string | null;
  priceInCents: number;
  billingCycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
  discountPercent: number | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  includedServiceId: string | null;
  includedUsesPerPeriod: number;
  includedBenefitType: "FREE_SERVICE" | null;
  includedService?: {
    id: string;
    name: string;
  } | null;
};

type ClubServiceOption = {
  id: string;
  name: string;
  price: number;
};

type ClubSubscriber = {
  id: string;
  status: "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELED" | "EXPIRED";
  provider: "ASAAS" | "MERCADO_PAGO";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  canceledAt: string | null;
  client: {
    id: string;
    name: string;
    phoneE164: string;
  };
  plan: {
    id: string;
    name: string;
    priceInCents: number;
    billingCycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
    discountPercent: number | null;
  };
};

type ClubSummary = {
  activeSubscribers: number;
  pendingSubscribers: number;
  overdueSubscribers: number;
  canceledSubscribers: number;
  expiredSubscribers: number;
  totalSubscribers: number;
  monthlyRecurringRevenueInCents: number;
  activeRevenueInCents: number;
  averageActiveTicketInCents: number;
  totalClubDiscountThisMonthInCents: number;
  clubAppointmentsThisMonth: number;
};

type ClubBenefitUsageItem = {
  id: string;
  periodKey: string;
  benefitType: "FREE_SERVICE";
  createdAt: string;
  client: {
    id: string;
    name: string;
    phoneE164: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
  };
  plan: {
    id: string;
    name: string;
  };
  appointment: {
    id: string;
    status: string;
    startsAt: string | null;
  };
};

type PaymentSettingsResponse = {
  clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
  asaas: {
    configured: boolean;
    environment: "SANDBOX" | "PRODUCTION";
  };
  mercadoPago: {
    configured: boolean;
    publicKeyConfigured: boolean;
    environment: "SANDBOX" | "PRODUCTION";
  };
};

type Props = {
  slug: string;
  initialTenant: ClubTenant;
  initialPlans: ClubPlan[];
  initialServices: ClubServiceOption[];
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

const formatCycle = (cycle: string) => {
  const cycles: Record<string, string> = {
    MONTHLY: "Mensal",
    QUARTERLY: "Trimestral",
    SEMIANNUAL: "Semestral",
    YEARLY: "Anual",
  };
  return cycles[cycle] || cycle;
};

const formatDateBR = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr));
};

const formatDateTimeBR = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateStr));
};

const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-zinc-500";

const shellCardClass =
  "rounded-3xl sm:rounded-[2rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const innerCardClass =
  "rounded-[1.75rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const mutedPanelClass =
  "rounded-[1.75rem] border border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950";

const inputClass =
  "h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-4 text-sm font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-950";

const inputWithIconClass =
  "h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-100 pl-11 pr-4 text-sm font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-950";

const textareaClass =
  "min-h-[112px] w-full rounded-3xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-950";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800";

const subtleButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700 transition-all hover:bg-zinc-200 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

function SummaryCard({
  icon,
  label,
  value,
  toneClass,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  toneClass: string;
}) {
  return (
    <div className={`${innerCardClass} p-4 sm:p-5`}>
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`rounded-2xl p-2.5 ${toneClass}`}>{icon}</div>
        <span className={labelClass}>{label}</span>
      </div>
      <p className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

export default function ClubPlansClient({
  slug,
  initialTenant,
  initialPlans,
  initialServices,
}: Props) {
  const [plans, setPlans] = useState<ClubPlan[]>(initialPlans);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ClubPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [clubPaymentProvider, setClubPaymentProvider] = useState<
    "ASAAS" | "MERCADO_PAGO" | ""
  >("");

  const [asaasEnvironment, setAsaasEnvironment] = useState<
    "SANDBOX" | "PRODUCTION"
  >("SANDBOX");
  const [asaasConfigured, setAsaasConfigured] = useState(false);
  const [asaasApiKeyInput, setAsaasApiKeyInput] = useState("");

  const [mercadoPagoEnvironment, setMercadoPagoEnvironment] = useState<
    "SANDBOX" | "PRODUCTION"
  >("SANDBOX");
  const [mercadoPagoConfigured, setMercadoPagoConfigured] = useState(false);
  const [mercadoPagoPublicKeyConfigured, setMercadoPagoPublicKeyConfigured] =
    useState(false);
  const [mercadoPagoAccessTokenInput, setMercadoPagoAccessTokenInput] =
    useState("");
  const [mercadoPagoPublicKeyInput, setMercadoPagoPublicKeyInput] =
    useState("");

  const [subscribers, setSubscribers] = useState<ClubSubscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);
  const [subscriberStatusFilter, setSubscriberStatusFilter] =
    useState<string>("ALL");
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [cancelingSubscriptionId, setCancelingSubscriptionId] = useState<
    string | null
  >(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(
    null
  );

  const [summary, setSummary] = useState<ClubSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [benefitUsages, setBenefitUsages] = useState<ClubBenefitUsageItem[]>(
    []
  );
  const [benefitUsagesLoading, setBenefitUsagesLoading] = useState(true);
  const [benefitUsagesError, setBenefitUsagesError] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    billingCycle: "MONTHLY",
    discountPercent: "",
    description: "",
    terms: "",
    isActive: true,
    includedServiceId: "",
    includedUsesPerPeriod: "0",
    includedBenefitType: "",
  });

  const includedUsesValue = useMemo(
    () => {
      const parsed = parseInt(formData.includedUsesPerPeriod, 10);
      return isNaN(parsed) ? 0 : parsed;
    },
    [formData.includedUsesPerPeriod]
  );

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const res = await fetch(`/api/admin/${slug}/club/summary`);
      if (!res.ok) throw new Error("Erro ao carregar resumo");

      const data = (await res.json()) as ClubSummary;
      setSummary(data);
    } catch {
      setSummaryError("Não foi possível carregar o resumo gerencial.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadSubscribers = async () => {
    setSubscribersLoading(true);
    setSubscribersError(null);

    try {
      const params = new URLSearchParams();

      if (subscriberStatusFilter !== "ALL") {
        params.append("status", subscriberStatusFilter);
      }

      if (subscriberSearch.trim()) {
        params.append("q", subscriberSearch.trim());
      }

      const query = params.toString();
      const res = await fetch(
        `/api/admin/${slug}/club/subscribers${query ? `?${query}` : ""}`
      );

      if (!res.ok) throw new Error("Erro ao carregar assinantes");

      const data = (await res.json()) as { subscribers?: ClubSubscriber[] };
      setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : []);
    } catch {
      setSubscribers([]);
      setSubscribersError("Não foi possível carregar a lista de assinantes.");
    } finally {
      setSubscribersLoading(false);
    }
  };

  const loadBenefitUsages = async () => {
    setBenefitUsagesLoading(true);
    setBenefitUsagesError(null);

    try {
      const res = await fetch(`/api/admin/${slug}/club/benefit-usages?limit=20`);
      if (!res.ok) throw new Error("Erro ao carregar usos");

      const data = (await res.json()) as {
        benefitUsages?: ClubBenefitUsageItem[];
      };

      setBenefitUsages(
        Array.isArray(data.benefitUsages) ? data.benefitUsages : []
      );
    } catch {
      setBenefitUsages([]);
      setBenefitUsagesError("Não foi possível carregar o histórico de usos.");
    } finally {
      setBenefitUsagesLoading(false);
    }
  };

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      setPaymentLoading(true);
      setPaymentError(null);

      try {
        const res = await fetch(`/api/admin/${slug}/club/payment-settings`);

        if (!res.ok) {
          throw new Error("Erro ao carregar configurações de pagamento.");
        }

        const data: PaymentSettingsResponse = await res.json();

        setClubPaymentProvider(data.clubPaymentProvider || "");
        setAsaasEnvironment(data.asaas?.environment || "SANDBOX");
        setAsaasConfigured(Boolean(data.asaas?.configured));
        setMercadoPagoEnvironment(
          data.mercadoPago?.environment || "SANDBOX"
        );
        setMercadoPagoConfigured(Boolean(data.mercadoPago?.configured));
        setMercadoPagoPublicKeyConfigured(
          Boolean(data.mercadoPago?.publicKeyConfigured)
        );
      } catch {
        setPaymentError(
          "Não foi possível carregar as configurações de pagamento."
        );
      } finally {
        setPaymentLoading(false);
      }
    };

    fetchPaymentSettings();
    loadSubscribers();
    loadSummary();
    loadBenefitUsages();
  }, [slug]);

  const cancelSubscription = async (subscriptionId: string) => {
    setCancelingSubscriptionId(subscriptionId);
    setConfirmingCancelId(null);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/${slug}/club/subscribers/${subscriptionId}/cancel`,
        {
          method: "POST",
        }
      );

      const data = (await res.json()) as {
        error?: string;
        gatewayCanceled?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error || "Erro ao cancelar assinatura.");
      }

      await loadSubscribers();
      await loadSummary();

      if (data.gatewayCanceled) {
        setMessage("Assinatura cancelada no gateway e no TratoMarcado.");
      } else {
        setMessage("Assinatura cancelada no TratoMarcado.");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
      setError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
      alert("Erro ao cancelar: " + msg);
    } finally {
      setCancelingSubscriptionId(null);
    }
  };

  const formatStatus = (status: ClubSubscriber["status"]) => {
    const labels: Record<ClubSubscriber["status"], string> = {
      PENDING: "Pendente",
      ACTIVE: "Ativo",
      OVERDUE: "Inadimplente",
      CANCELED: "Cancelado",
      EXPIRED: "Expirado",
    };
    return labels[status] || status;
  };

  const statusBadgeClass = (status: ClubSubscriber["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
      case "PENDING":
        return "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
      case "OVERDUE":
        return "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400";
      case "CANCELED":
      case "EXPIRED":
        return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const whatsappLink = (phone: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}`;

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      billingCycle: "MONTHLY",
      discountPercent: "",
      description: "",
      terms: "",
      isActive: true,
      includedServiceId: "",
      includedUsesPerPeriod: "0",
      includedBenefitType: "",
    });
    setEditingPlan(null);
  };

  const handleOpenForm = (plan?: ClubPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: (plan.priceInCents / 100).toString(),
        billingCycle: plan.billingCycle,
        discountPercent: plan.discountPercent?.toString() || "",
        description: plan.description || "",
        terms: plan.terms || "",
        isActive: plan.isActive,
        includedServiceId: plan.includedServiceId || "",
        includedUsesPerPeriod: plan.includedUsesPerPeriod.toString(),
        includedBenefitType: plan.includedBenefitType || "",
      });
    } else {
      resetForm();
    }

    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const payload = {
      ...formData,
      priceInCents: Math.round(
        parseFloat(formData.price.replace(",", ".")) * 100
      ),
      discountPercent: formData.discountPercent
        ? parseFloat(formData.discountPercent)
        : null,
      includedServiceId: formData.includedServiceId || null,
      includedUsesPerPeriod: includedUsesValue,
      includedBenefitType:
        includedUsesValue !== 0
          ? (formData.includedBenefitType || "FREE_SERVICE")
          : null,
    };

    try {
      const url = editingPlan
        ? `/api/admin/${slug}/club/plans/${editingPlan.id}`
        : `/api/admin/${slug}/club/plans`;

      const res = await fetch(url, {
        method: editingPlan ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar plano");

      const savedPlan = (await res.json()) as ClubPlan;

      if (editingPlan) {
        setPlans((prev) =>
          prev.map((plan) => (plan.id === savedPlan.id ? savedPlan : plan))
        );
      } else {
        setPlans((prev) => [savedPlan, ...prev]);
      }

      setMessage("Plano salvo com sucesso.");
      setIsFormOpen(false);
      resetForm();
    } catch {
      setError("Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja desativar este plano?"
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/${slug}/club/plans/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setPlans((prev) =>
        prev.map((plan) =>
          plan.id === id ? { ...plan, isActive: false } : plan
        )
      );
      setMessage("Plano desativado com sucesso.");
    } catch {
      setError("Não foi possível concluir a ação.");
    }
  };

  const handleSavePaymentSettings = async () => {
    setPaymentSaving(true);
    setPaymentError(null);
    setPaymentMessage(null);

    try {
      const res = await fetch(`/api/admin/${slug}/club/payment-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubPaymentProvider: clubPaymentProvider || null,
          asaasEnvironment,
          asaasApiKey: asaasApiKeyInput || undefined,
          mercadoPagoEnvironment,
          mercadoPagoAccessToken: mercadoPagoAccessTokenInput || undefined,
          mercadoPagoPublicKey: mercadoPagoPublicKeyInput || undefined,
        }),
      });

      const data: PaymentSettingsResponse = await res.json();

      if (!res.ok) {
        throw new Error("Erro ao salvar configurações");
      }

      setClubPaymentProvider(data.clubPaymentProvider || "");
      setAsaasConfigured(Boolean(data.asaas?.configured));
      setAsaasEnvironment(data.asaas?.environment || "SANDBOX");
      setAsaasApiKeyInput("");

      setMercadoPagoConfigured(Boolean(data.mercadoPago?.configured));
      setMercadoPagoPublicKeyConfigured(
        Boolean(data.mercadoPago?.publicKeyConfigured)
      );
      setMercadoPagoEnvironment(data.mercadoPago?.environment || "SANDBOX");
      setMercadoPagoAccessTokenInput("");
      setMercadoPagoPublicKeyInput("");

      setPaymentMessage("Configuração de pagamento salva.");
    } catch {
      setPaymentError(
        "Ocorreu um erro ao salvar as configurações de pagamento."
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  const planTier = initialTenant.planTier || "PRO";

  if (planTier === "BASICO") {
    return (
      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-center mt-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 text-[10px] font-black px-5 py-1.5 rounded-bl-2xl uppercase tracking-widest">
            Funcionalidade Premium
          </div>
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
              <Crown size={32} />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase mb-4">
            Clube de Assinaturas não disponível
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto mb-8 font-semibold">
            O plano <span className="text-emerald-400">Trato Básico</span> não inclui módulo de Clube de Assinaturas. Faça um upgrade para o plano <span className="text-emerald-400">Trato Essencial</span> ou <span className="text-emerald-400">Trato Pro</span> e garanta faturamento recorrente previsível!
          </p>
          <a
            href={`/admin/${slug}/billing`}
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/10"
          >
            Fazer Upgrade do Plano
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className={shellCardClass}>
          <div className="border-b border-zinc-200 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent px-5 py-6 dark:border-zinc-800 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className={labelClass}>Clube de assinaturas</p>
                <h1 className="mt-2 text-[1.75rem] font-black italic leading-[1.05] tracking-tighter text-zinc-900 dark:text-white sm:text-4xl">
                  Faça seus clientes voltarem com recorrência.
                </h1>
                <p className="mt-3 text-[13px] font-bold leading-5 text-zinc-500">
                  Crie planos, acompanhe assinantes, configure cobrança e
                  visualize o uso dos benefícios do clube da sua barbearia.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="rounded-3xl border border-zinc-200 bg-white/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                  <p className={labelClass}>Status do clube</p>
                  <div className="mt-2 flex items-center gap-2">
                    {initialTenant.clubEnabled ? (
                      <CheckCircle2 className="text-emerald-500" size={18} />
                    ) : (
                      <XCircle className="text-red-500" size={18} />
                    )}
                    <span className="text-sm font-black text-zinc-900 dark:text-white">
                      {initialTenant.clubEnabled ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenForm()}
                  className={primaryButtonClass}
                >
                  <Plus size={18} />
                  Novo plano
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:px-8 sm:py-6 md:grid-cols-2">
            <div className={`${mutedPanelClass} p-5`}>
              <p className={labelClass}>Gateway do clube</p>
              <p className="mt-2 text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white">
                {clubPaymentProvider || "Não configurado"}
              </p>
            </div>

            <div className={`${mutedPanelClass} p-5`}>
              <p className={labelClass}>Tenant</p>
              <p className="mt-2 text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white">
                {initialTenant.name}
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                /{initialTenant.slug}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className={labelClass}>Visão geral</p>
            <h2 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              Resumo do clube
            </h2>
          </div>

          {summaryError && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                {summaryError}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {summaryLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${innerCardClass} h-32 animate-pulse bg-zinc-100 dark:bg-zinc-900`}
                />
              ))
            ) : summary ? (
              <>
                <SummaryCard
                  icon={<Users size={20} />}
                  label="Assinantes ativos"
                  value={summary.activeSubscribers}
                  toneClass="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                />
                <SummaryCard
                  icon={<Wallet size={20} />}
                  label="Receita mensal prevista"
                  value={formatCurrency(summary.monthlyRecurringRevenueInCents)}
                  toneClass="bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                />
                <SummaryCard
                  icon={<Clock size={20} />}
                  label="Pendentes"
                  value={summary.pendingSubscribers}
                  toneClass="bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                />
                <SummaryCard
                  icon={<AlertTriangle size={20} />}
                  label="Inadimplentes"
                  value={summary.overdueSubscribers}
                  toneClass="bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                />
                <SummaryCard
                  icon={<BadgePercent size={20} />}
                  label="Descontos no mês"
                  value={formatCurrency(
                    summary.totalClubDiscountThisMonthInCents
                  )}
                  toneClass="bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
                />
                <SummaryCard
                  icon={<CalendarCheck size={20} />}
                  label="Agendamentos com clube"
                  value={summary.clubAppointmentsThisMonth}
                  toneClass="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                />
              </>
            ) : null}
          </div>
        </section>

        <section className={shellCardClass}>
          <div className="border-b border-zinc-200 px-6 py-6 dark:border-zinc-800 sm:px-8">
            <p className={labelClass}>Configuração de cobrança</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              <CreditCard size={22} className="text-emerald-500" />
              Pagamento do clube
            </h2>
            <p className="mt-2 text-sm font-bold text-zinc-500">
              Configure como os clientes pagarão as assinaturas da barbearia.
            </p>
          </div>

          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
            {paymentLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="animate-spin text-emerald-500" />
              </div>
            ) : (
              <>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className={labelClass}>Gateway do clube</label>
                    <div className="relative">
                      <CreditCard
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                        size={18}
                      />
                      <select
                        className={inputWithIconClass}
                        value={clubPaymentProvider}
                        onChange={(e) =>
                          setClubPaymentProvider(
                            e.target.value as "" | "ASAAS" | "MERCADO_PAGO"
                          )
                        }
                      >
                        <option value="">Selecione um gateway</option>
                        <option value="ASAAS">ASAAS</option>
                        <option value="MERCADO_PAGO">Mercado Pago</option>
                      </select>
                    </div>
                  </div>

                  {clubPaymentProvider === "ASAAS" && (
                    <div className={`${mutedPanelClass} space-y-5 p-5`}>
                      <div className="space-y-2">
                        <label className={labelClass}>Ambiente</label>
                        <select
                          className={inputClass}
                          value={asaasEnvironment}
                          onChange={(e) =>
                            setAsaasEnvironment(
                              e.target.value as "SANDBOX" | "PRODUCTION"
                            )
                          }
                        >
                          <option value="SANDBOX">Sandbox (testes)</option>
                          <option value="PRODUCTION">Produção</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>
                          Chave API Asaas da barbearia
                        </label>
                        <input
                          type="password"
                          className={inputClass}
                          value={asaasApiKeyInput}
                          onChange={(e) => setAsaasApiKeyInput(e.target.value)}
                          placeholder="$aact_..."
                        />
                        {asaasConfigured && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Chave cadastrada. Preencha novamente apenas se quiser
                            substituir.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {clubPaymentProvider === "MERCADO_PAGO" && (
                    <div className={`${mutedPanelClass} space-y-5 p-5`}>
                      <div className="space-y-2">
                        <label className={labelClass}>Ambiente</label>
                        <select
                          className={inputClass}
                          value={mercadoPagoEnvironment}
                          onChange={(e) =>
                            setMercadoPagoEnvironment(
                              e.target.value as "SANDBOX" | "PRODUCTION"
                            )
                          }
                        >
                          <option value="SANDBOX">Sandbox (testes)</option>
                          <option value="PRODUCTION">Produção</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>
                          Access Token do Mercado Pago
                        </label>
                        <input
                          type="password"
                          className={inputClass}
                          value={mercadoPagoAccessTokenInput}
                          onChange={(e) =>
                            setMercadoPagoAccessTokenInput(e.target.value)
                          }
                          placeholder="APP_USR-..."
                        />
                        {mercadoPagoConfigured && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Access token cadastrado. Preencha novamente apenas
                            se quiser substituir.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>
                          Public Key do Mercado Pago
                        </label>
                        <input
                          type="text"
                          className={inputClass}
                          value={mercadoPagoPublicKeyInput}
                          onChange={(e) =>
                            setMercadoPagoPublicKeyInput(e.target.value)
                          }
                          placeholder="APP_USR-..."
                        />
                        {mercadoPagoPublicKeyConfigured && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Public key cadastrada. Preencha novamente apenas se
                            quiser substituir.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`${mutedPanelClass} flex flex-col justify-between p-5`}
                >
                  <div className="space-y-4">
                    <div>
                      <p className={labelClass}>Resumo da configuração</p>
                      <p className="mt-2 text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white">
                        {clubPaymentProvider || "Sem gateway selecionado"}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                      <p className={labelClass}>Status da chave</p>
                      <div className="mt-2 flex items-center gap-2">
                        {clubPaymentProvider === "ASAAS" ? (
                          asaasConfigured ? (
                            <>
                              <ShieldCheck
                                size={18}
                                className="text-emerald-500"
                              />
                              <span className="text-sm font-black text-zinc-900 dark:text-white">
                                Chave Asaas configurada
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle
                                size={18}
                                className="text-amber-500"
                              />
                              <span className="text-sm font-black text-zinc-900 dark:text-white">
                                Aguardando chave Asaas
                              </span>
                            </>
                          )
                        ) : clubPaymentProvider === "MERCADO_PAGO" ? (
                          mercadoPagoConfigured ? (
                            <>
                              <ShieldCheck
                                size={18}
                                className="text-emerald-500"
                              />
                              <span className="text-sm font-black text-zinc-900 dark:text-white">
                                Mercado Pago configurado
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle
                                size={18}
                                className="text-amber-500"
                              />
                              <span className="text-sm font-black text-zinc-900 dark:text-white">
                                Aguardando credenciais do Mercado Pago
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            <AlertTriangle
                              size={18}
                              className="text-amber-500"
                            />
                            <span className="text-sm font-black text-zinc-900 dark:text-white">
                              Selecione um gateway
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {paymentMessage && (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {paymentMessage}
                      </div>
                    )}

                    {paymentError && (
                      <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {paymentError}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={paymentSaving}
                    onClick={handleSavePaymentSettings}
                    className={`${primaryButtonClass} mt-6 w-full`}
                  >
                    {paymentSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar configuração"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {(message || error) && (
          <section className="space-y-3">
            {message && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}
          </section>
        )}

        {isFormOpen && (
          <section className={`${shellCardClass} p-6 sm:p-8`}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={labelClass}>Plano do clube</p>
                <h2 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                  {editingPlan ? "Editar plano" : "Novo plano"}
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClass}>Nome do plano</label>
                  <input
                    required
                    className={inputClass}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Clube Premium"
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Preço (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className={inputClass}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="39,90"
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Ciclo de cobrança</label>
                  <select
                    className={inputClass}
                    value={formData.billingCycle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        billingCycle: e.target.value,
                      }))
                    }
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Desconto em serviços (%)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.discountPercent}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discountPercent: e.target.value,
                      }))
                    }
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClass}>Descrição / benefícios</label>
                  <textarea
                    className={`${textareaClass} h-32`}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Descreva os benefícios do plano."
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Regras e Termos</label>
                  <textarea
                    className={`${textareaClass} h-32`}
                    value={formData.terms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        terms: e.target.value,
                      }))
                    }
                    placeholder="Regras de uso, política de cancelamento, etc."
                  />
                </div>
              </div>

              <div className={`${mutedPanelClass} p-5`}>
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <h3 className="text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white">
                    Benefício incluso no ciclo
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className={labelClass}>Quantidade por ciclo</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="-1"
                        className={`${inputClass} flex-1`}
                        disabled={formData.includedUsesPerPeriod === "-1"}
                        value={formData.includedUsesPerPeriod === "-1" ? "" : formData.includedUsesPerPeriod}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            includedUsesPerPeriod: e.target.value,
                          }))
                        }
                        placeholder={formData.includedUsesPerPeriod === "-1" ? "Ilimitado" : "0"}
                      />
                      <label className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 cursor-pointer transition-colors hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-emerald-900/20">
                        <input
                          type="checkbox"
                          checked={formData.includedUsesPerPeriod === "-1"}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              includedUsesPerPeriod: e.target.checked ? "-1" : "1",
                            }))
                          }
                          className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          Ilimitado
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>Serviço incluído</label>
                    <select
                      className={inputClass}
                      value={formData.includedServiceId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          includedServiceId: e.target.value,
                        }))
                      }
                      required={includedUsesValue !== 0}
                    >
                      <option value="">Nenhum serviço incluso</option>
                      {initialServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>Tipo do benefício</label>
                    <select
                      className={inputClass}
                      value={formData.includedBenefitType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          includedBenefitType: e.target.value,
                        }))
                      }
                      required={includedUsesValue !== 0}
                    >
                      <option value="">Nenhum</option>
                      <option value="FREE_SERVICE">Serviço grátis</option>
                    </select>
                  </div>
                </div>

                <p className="mt-4 text-xs font-bold text-zinc-500">
                  Exemplo: 1 corte grátis por mês.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-3xl border border-zinc-200 bg-zinc-100/70 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm font-black text-zinc-900 dark:text-white">
                  Plano ativo
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className={secondaryButtonClass}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={primaryButtonClass}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar plano"
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={labelClass}>Produtos do clube</p>
              <h2 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                Planos disponíveis
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {plans.length === 0 ? (
              <div
                className={`${shellCardClass} col-span-full flex flex-col items-center justify-center px-6 py-14 text-center`}
              >
                <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-950">
                  <Crown size={30} className="text-zinc-500" />
                </div>
                <h3 className="mt-4 text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                  Nenhum plano criado ainda
                </h3>
                <p className="mt-2 max-w-sm text-sm font-bold text-zinc-500">
                  Crie seu primeiro plano para exibir o clube na página pública.
                </p>
              </div>
            ) : (
              plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`${shellCardClass} relative overflow-hidden p-5 ${
                    !plan.isActive ? "opacity-80" : ""
                  }`}
                >
                  <div className="absolute right-5 top-5">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                        plan.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                      }`}
                    >
                      {plan.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="pr-20">
                    <p className={labelClass}>Plano</p>
                    <h3 className="mt-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-3 text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                      {formatCurrency(plan.priceInCents)}
                      <span className="ml-2 text-sm font-bold not-italic text-zinc-500">
                        /{formatCycle(plan.billingCycle).toLowerCase()}
                      </span>
                    </p>
                  </div>

                  {plan.description && (
                    <p className="mt-4 text-sm font-bold text-zinc-500">
                      {plan.description}
                    </p>
                  )}

                  <div className="mt-5 space-y-3">
                    {plan.discountPercent ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {plan.discountPercent}% de desconto em serviços
                      </div>
                    ) : null}

                    {plan.includedUsesPerPeriod !== 0 && plan.includedService && (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <p className={labelClass}>Benefício incluso</p>
                        <div className="mt-2 flex items-start gap-3">
                          <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                            <Scissors size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-zinc-900 dark:text-white">
                              {plan.includedUsesPerPeriod === -1 ? 'Uso ilimitado' : `${plan.includedUsesPerPeriod}x`}{" "}
                              {plan.includedService.name}
                            </p>
                            <p className="mt-1 text-xs font-bold text-zinc-500">
                              {plan.includedBenefitType === "FREE_SERVICE"
                                ? "Serviço grátis"
                                : plan.includedBenefitType}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => handleOpenForm(plan)}
                      className={`${secondaryButtonClass} flex-1`}
                    >
                      <Pencil size={16} />
                      Editar
                    </button>

                    {plan.isActive && (
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition-all hover:bg-red-100 active:scale-95 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={16} />
                        Desativar
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className={shellCardClass}>
          <div className="border-b border-zinc-200 px-6 py-6 dark:border-zinc-800 sm:px-8">
            <p className={labelClass}>Clientes recorrentes</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              <Users size={22} className="text-emerald-500" />
              Assinantes do clube
            </h2>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar por nome ou WhatsApp..."
                  className={inputWithIconClass}
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                />
              </div>

              <select
                className={`${inputClass} xl:w-[220px]`}
                value={subscriberStatusFilter}
                onChange={(e) => setSubscriberStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="PENDING">Pendentes</option>
                <option value="OVERDUE">Inadimplentes</option>
                <option value="CANCELED">Cancelados</option>
                <option value="EXPIRED">Expirados</option>
              </select>

              <button
                onClick={() => {
                  loadSubscribers();
                  loadSummary();
                }}
                disabled={subscribersLoading}
                className={secondaryButtonClass}
              >
                {subscribersLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Atualizar
              </button>
            </div>

            {subscribersError && (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {subscribersError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {subscribersLoading && subscribers.length === 0 ? (
                <div className="col-span-full flex justify-center py-10">
                  <Loader2 className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : subscribers.length === 0 ? (
                <div
                  className={`${mutedPanelClass} col-span-full px-6 py-12 text-center text-sm font-black text-zinc-500`}
                >
                  Nenhum assinante encontrado.
                </div>
              ) : (
                subscribers.map((sub) => {
                  const clientDisplayName =
                    sub.client?.name?.trim() ||
                    sub.client?.phoneE164 ||
                    "Cliente";

                  return (
                    <article key={sub.id} className={`${innerCardClass} p-5`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={labelClass}>Assinante</p>
                          <h3 className="mt-2 text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                            {clientDisplayName}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-zinc-500">
                            {sub.client?.phoneE164 || ""}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(
                            sub.status
                          )}`}
                        >
                          {formatStatus(sub.status)}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3 rounded-3xl border border-zinc-200 bg-zinc-100/80 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Plano
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {sub.plan.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Valor
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {formatCurrency(sub.plan.priceInCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Ciclo
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {formatCycle(sub.plan.billingCycle)}
                          </span>
                        </div>
                        {sub.currentPeriodEnd && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                              Validade
                            </span>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">
                              {formatDateBR(sub.currentPeriodEnd)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex flex-col gap-3">
                        <a
                          href={whatsappLink(sub.client.phoneE164)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={primaryButtonClass}
                        >
                          <MessageCircle size={16} />
                          WhatsApp
                        </a>

                        {sub.status !== "CANCELED" &&
                          sub.status !== "EXPIRED" && (
                            <div className="flex flex-col gap-2">
                              {confirmingCancelId === sub.id ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                                  <p className="mb-3 text-sm font-bold text-red-800 dark:text-red-300">
                                    Tem certeza que deseja cancelar esta assinatura?
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => cancelSubscription(sub.id)}
                                      disabled={cancelingSubscriptionId === sub.id}
                                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {cancelingSubscriptionId === sub.id ? (
                                        <>
                                          <Loader2 size={14} className="animate-spin" />
                                          Cancelando...
                                        </>
                                      ) : (
                                        "Sim, cancelar"
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setConfirmingCancelId(null)}
                                      disabled={cancelingSubscriptionId === sub.id}
                                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmingCancelId(sub.id)}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition-all hover:bg-red-100 active:scale-95 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
                                >
                                  <Ban size={16} />
                                  Cancelar assinatura
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className={shellCardClass}>
          <div className="border-b border-zinc-200 px-6 py-6 dark:border-zinc-800 sm:px-8">
            <p className={labelClass}>Histórico do clube</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              <History size={22} className="text-emerald-500" />
              Usos recentes de benefícios
            </h2>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {benefitUsagesError && (
              <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {benefitUsagesError}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {benefitUsagesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${innerCardClass} h-60 animate-pulse bg-zinc-100 dark:bg-zinc-900`}
                  />
                ))
              ) : benefitUsages.length === 0 ? (
                <div
                  className={`${mutedPanelClass} col-span-full px-6 py-12 text-center text-sm font-black text-zinc-500`}
                >
                  Nenhum uso de benefício registrado até o momento.
                </div>
              ) : (
                benefitUsages.map((usage) => {
                  const clientDisplayName =
                    usage.client?.name?.trim() ||
                    usage.client?.phoneE164 ||
                    "Cliente";

                  return (
                    <article key={usage.id} className={`${innerCardClass} p-5`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={labelClass}>Cliente</p>
                          <h3 className="mt-2 text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                            {clientDisplayName}
                          </h3>
                          <p className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-500">
                            {usage.plan.name}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <Scissors size={18} />
                        </div>
                      </div>

                      <div className="mt-5 space-y-3 rounded-3xl border border-zinc-200 bg-zinc-100/80 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Serviço
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {usage.service.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Tipo
                          </span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            Serviço grátis
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Valor
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {formatCurrency(usage.service.price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Período
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {usage.periodKey}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Data do uso
                          </span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">
                            {formatDateBR(usage.createdAt)}
                          </span>
                        </div>
                      </div>

                      {usage.appointment?.startsAt && (
                        <div className="mt-4 flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                          <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <CalendarClock size={16} />
                          </div>
                          <div>
                            <p className={labelClass}>Agendamento</p>
                            <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">
                              {formatDateTimeBR(usage.appointment.startsAt)}
                            </p>
                          </div>
                        </div>
                      )}

                      <a
                        href={whatsappLink(usage.client.phoneE164)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${subtleButtonClass} mt-4 w-full`}
                      >
                        <MessageCircle size={16} />
                        Contatar cliente
                      </a>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
