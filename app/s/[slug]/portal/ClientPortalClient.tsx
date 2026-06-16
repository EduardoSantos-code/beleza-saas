"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  ShoppingBag,
  Crown,
  Phone,
  ArrowLeft,
  XCircle,
  Clock,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  ChevronDown
} from "lucide-react";

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  clubEnabled: boolean;
  minAdvanceHours: number;
};

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED" | "NOSHOW";
  notes: string | null;
  serviceId: string;
  professionalId: string;
  service: {
    name: string;
    durationMin: number;
    price: number;
  };
  professional: {
    name: string;
  };
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  active: boolean;
};

type ReservationItem = {
  id: string;
  quantity: number;
  priceAtReservation: number;
  product: {
    name: string;
    imageUrl: string | null;
  };
};

type ProductReservation = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "PICKED_UP";
  createdAt: string;
  items: ReservationItem[];
};

type PortalSubscription = {
  id: string;
  status: "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELED" | "EXPIRED";
  provider: "ASAAS" | "MERCADO_PAGO";
  currentPeriodEnd: string | null;
  plan: {
    name: string;
    priceInCents: number;
    billingCycle: string;
    discountPercent: number | null;
  };
};

type Props = {
  slug: string;
  tenant: TenantInfo;
};

// Utils
function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateBR(dateStr: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTimeBR(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "ACTIVE":
    case "PICKED_UP":
      return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-950 dark:bg-amber-500/15 dark:text-amber-400";
    case "CANCELED":
    case "EXPIRED":
      return "border-red-200 bg-red-100 text-red-700 dark:border-red-950 dark:bg-red-500/15 dark:text-red-400";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

function translateStatus(status: string) {
  const dict: Record<string, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmado",
    CANCELED: "Cancelado",
    COMPLETED: "Concluído",
    NOSHOW: "Faltou",
    PICKED_UP: "Retirado",
    ACTIVE: "Ativo",
    EXPIRED: "Expirado",
  };
  return dict[status] || status;
}

export default function ClientPortalClient({ slug, tenant }: Props) {
  const [step, setStep] = useState<"LOGIN" | "REGISTER" | "DASHBOARD">("LOGIN");
  const [phoneE164, setPhoneE164] = useState("+55");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState<"appointments" | "products" | "club">("appointments");

  // Dados do Dashboard
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reservations, setReservations] = useState<ProductReservation[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<PortalSubscription[]>([]);
  const [clientName, setClientName] = useState("");

  // Carrinho
  const [cart, setCart] = useState<Record<string, number>>({});

  // Reagendamento
  const [reschedulingApp, setReschedulingApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([]);
  const [selectedProfId, setSelectedProfId] = useState("");
  const [slots, setSlots] = useState<{ iso: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reschedulingLoading, setReschedulingLoading] = useState(false);

  const primaryColor = tenant.primaryColor || "#3b82f6";

  // Formatar Telefone
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d+]/g, "");
    if (!value.startsWith("+55")) {
      value = "+55" + value.replace(/\D/g, "");
    }
    if (value.length <= 14) {
      setPhoneE164(value);
    }
  };

  // Login
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (phoneE164.length !== 14) {
      setError("Informe o WhatsApp com o DDD (Ex: +5511999998888)");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/public/${slug}/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164 }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao conectar.");

      if (data.registered) {
        setClientName(data.name);
        setStep("DASHBOARD");
        await loadDashboardData();
      } else {
        setStep("REGISTER");
      }
    } catch (err: any) {
      setError(err.message || "Erro de login.");
    } finally {
      setLoading(false);
    }
  };

  // Registrar
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError("O nome precisa ter no mínimo 3 letras.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/public/${slug}/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164, name }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao criar perfil.");

      setClientName(data.name);
      setStep("DASHBOARD");
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Erro no cadastro.");
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados
  const loadDashboardData = async () => {
    try {
      setError("");
      // Buscar agendamentos
      const resApps = await fetch(`/api/public/${slug}/portal/appointments`);
      if (resApps.ok) {
        const dataApps = await resApps.json();
        setAppointments(dataApps.appointments);
      }

      // Buscar reservas de produtos
      const resRes = await fetch(`/api/public/${slug}/portal/reservations`);
      if (resRes.ok) {
        const dataRes = await resRes.json();
        setReservations(dataRes.reservations);
      }

      // Buscar catálogo de produtos ativos
      const resCatalog = await fetch(`/api/public/${slug}/products`);
      if (resCatalog.ok) {
        const dataCat = await resCatalog.json();
        setCatalog(dataCat.products);
      }

      // Buscar Clube (se ativo)
      if (tenant.clubEnabled) {
        const resClub = await fetch(`/api/public/${slug}/club/portal/me`);
        if (resClub.ok) {
          const dataClub = await resClub.json();
          setSubscriptions(dataClub.subscriptions || []);
        }
      }

      // Buscar profissionais da barbearia para o formulário de reagendamento
      const resProfessionals = await fetch(`/api/public/${slug}/catalog`);
      if (resProfessionals.ok) {
        const dataCat = await resProfessionals.json();
        setProfessionals(dataCat.professionals || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard", err);
    }
  };

  // Cancelar Agendamento
  const handleCancelApp = async (appId: string) => {
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`/api/public/${slug}/appointments/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível cancelar.");

      setSuccess("Agendamento cancelado com sucesso!");
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Erro ao cancelar.");
    }
  };

  // Cancelar Reserva de Produto
  const handleCancelReservation = async (resId: string) => {
    if (!window.confirm("Tem certeza que deseja cancelar esta reserva de produto? Os produtos voltarão ao estoque da barbearia.")) return;
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`/api/public/${slug}/portal/reservations/${resId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível cancelar a reserva.");

      setSuccess("Reserva cancelada com sucesso!");
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Erro ao cancelar reserva.");
    }
  };

  // Buscar Slots de Reagendamento
  useEffect(() => {
    async function loadRescheduleSlots() {
      if (!reschedulingApp || !selectedProfId || !rescheduleDate) return;
      try {
        setLoadingSlots(true);
        setSlots([]);
        const qs = new URLSearchParams({
          serviceId: reschedulingApp.serviceId,
          professionalId: selectedProfId,
          date: rescheduleDate,
        });

        const res = await fetch(`/api/public/${slug}/availability?${qs.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    }
    if (reschedulingApp && selectedProfId && rescheduleDate) {
      loadRescheduleSlots();
    }
  }, [reschedulingApp, selectedProfId, rescheduleDate, slug]);

  // Abrir painel de Reagendamento
  const openReschedule = (app: Appointment) => {
    setReschedulingApp(app);
    setSelectedProfId(professionals[0]?.id || "");
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    setRescheduleDate(hoje);
    setSelectedSlot("");
  };

  // Efetuar Reagendamento
  const handleReschedule = async () => {
    if (!reschedulingApp || !selectedSlot) return;

    try {
      setReschedulingLoading(true);
      setError("");
      setSuccess("");
      const res = await fetch(`/api/public/${slug}/appointments/${reschedulingApp.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: selectedSlot,
          professionalId: selectedProfId,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao reagendar.");

      setSuccess("Agendamento reagendado com sucesso!");
      setReschedulingApp(null);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Erro ao reagendar.");
    } finally {
      setReschedulingLoading(false);
    }
  };

  // Modificadores do Carrinho
  const updateCart = (productId: string, delta: number, stock: number) => {
    setCart((current) => {
      const copy = { ...current };
      const currentQty = copy[productId] || 0;
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        delete copy[productId];
      } else if (newQty <= stock) {
        copy[productId] = newQty;
      }
      return copy;
    });
  };

  // Finalizar Reserva de Produtos
  const handleReserveProducts = async () => {
    const items = Object.entries(cart).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    if (items.length === 0) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const res = await fetch(`/api/public/${slug}/products/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao concluir reserva.");

      setSuccess("Reserva efetuada com sucesso! Retire seus produtos na barbearia.");
      setCart({});
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || "Erro ao fazer reserva.");
    } finally {
      setLoading(false);
    }
  };

  const cartTotalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotalValue = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = catalog.find((p) => p.id === id);
    return sum + (prod?.price || 0) * qty;
  }, 0);

  // Interface de LOGIN
  if (step === "LOGIN") {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-blue-500/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 text-center">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="mx-auto h-20 w-auto object-contain rounded-2xl mb-4" />
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white mb-4" style={{ backgroundColor: primaryColor }}>
                {tenant.name.slice(0,1).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Portal do Cliente</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold uppercase tracking-wider mt-1">{tenant.name}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-950 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-zinc-500 mb-2">Digite seu WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={14}
                  value={phoneE164}
                  onChange={handlePhoneChange}
                  placeholder="+5511999998888"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-100 pl-12 pr-4 text-sm font-bold text-zinc-900 outline-none focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl text-sm font-black uppercase tracking-wider text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
              style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
            >
              {loading ? "Verificando..." : "Consultar Histórico"}
            </button>

            <Link
              href={`/s/${slug}`}
              className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft size={14} /> Voltar para o início
            </Link>
          </form>
        </div>
      </div>
    );
  }

  // Interface de REGISTRO (Novo cliente)
  if (step === "REGISTER") {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md w-full rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Olá! Parece que você é novo</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mt-2">
              Cadastre seu nome para consultar reservas de produtos e gerenciar seus horários.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-950 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-zinc-500 mb-2">Seu Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome..."
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-100 pl-12 pr-4 text-sm font-bold text-zinc-900 outline-none focus:border-zinc-900 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl text-sm font-black uppercase tracking-wider text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "Cadastrando..." : "Acessar Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Interface do DASHBOARD
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      {/* Banner / Cabeçalho */}
      <header className="bg-zinc-900 text-white py-6 border-b border-zinc-800 relative">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-12 w-auto object-contain rounded-xl" />
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ backgroundColor: primaryColor }}>
                {tenant.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-black italic leading-none">{tenant.name}</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Portal do Cliente</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700">
              {clientName}
            </span>
            <button
              onClick={() => setStep("LOGIN")}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850">
        <div className="max-w-4xl mx-auto px-4 flex gap-4">
          <button
            onClick={() => setActiveTab("appointments")}
            className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "appointments"
                ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            }`}
          >
            <CalendarDays size={16} />
            Agendamentos
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "products"
                ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            }`}
          >
            <ShoppingBag size={16} />
            Produtos
          </button>
          {tenant.clubEnabled && (
            <button
              onClick={() => setActiveTab("club")}
              className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === "club"
                  ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              }`}
            >
              <Crown size={16} className="text-amber-500" />
              Clube
            </button>
          )}
        </div>
      </div>

      {/* Mensagens de feedback */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 mb-4 animate-in fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 dark:border-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-400 mb-4 animate-in fade-in">
            {success}
          </div>
        )}
      </div>

      {/* MODAL DE REAGENDAMENTO */}
      {reschedulingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black italic text-zinc-900 dark:text-white">Reagendar Trato</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase mt-1">Serviço: {reschedulingApp.service.name}</p>
              </div>
              <button
                onClick={() => setReschedulingApp(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Escolha o Profissional */}
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500">1. Profissional</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                  <select
                    value={selectedProfId}
                    onChange={(e) => setSelectedProfId(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 pl-12 pr-10 py-3 text-sm font-bold text-zinc-900 dark:text-white outline-none"
                  >
                    {professionals.map((prof) => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* 2. Escolha o dia */}
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500">2. Escolha o dia</label>
                <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="block w-full bg-transparent pl-12 pr-4 py-3.5 text-sm font-bold text-zinc-900 dark:text-white outline-none cursor-pointer [color-scheme:light_dark]"
                  />
                </div>
              </div>

              {/* 3. Escolha o horário */}
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500 flex justify-between">
                  3. Novo Horário
                  {loadingSlots && <span className="animate-pulse text-zinc-400">Buscando...</span>}
                </label>

                {slots.length === 0 && !loadingSlots ? (
                  <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center text-xs font-bold text-zinc-400">
                    Nenhum horário livre para este profissional neste dia.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const selected = selectedSlot === slot.iso;
                      return (
                        <button
                          key={slot.iso}
                          type="button"
                          onClick={() => setSelectedSlot(slot.iso)}
                          className={`rounded-xl border py-2 text-xs font-black transition-all cursor-pointer ${
                            selected
                              ? "border-transparent text-white shadow-md scale-[1.02]"
                              : "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                          style={selected ? { backgroundColor: primaryColor } : undefined}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleReschedule}
              disabled={reschedulingLoading || !selectedSlot}
              className="w-full h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {reschedulingLoading ? "Processando..." : "Confirmar Reagendamento"}
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD SECTIONS */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* ABA AGENDAMENTOS */}
        {activeTab === "appointments" && (
          <section className="space-y-6">
            <h2 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Meus Agendamentos</h2>

            {appointments.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
                <p className="text-sm font-bold text-zinc-400">Você não possui nenhum agendamento ainda.</p>
                <Link
                  href={`/s/${slug}`}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider text-white px-6 transition-all hover:opacity-90 cursor-pointer shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  Agendar agora
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((app) => {
                  const isCancelable = app.status === "PENDING" || app.status === "CONFIRMED";
                  // Validar antecedência no front
                  const minHours = tenant.minAdvanceHours || 2;
                  const canCancel = isCancelable && (new Date(app.startAt).getTime() - new Date().getTime() > minHours * 60 * 60 * 1000);

                  return (
                    <div
                      key={app.id}
                      className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(app.status)}`}>
                            {translateStatus(app.status)}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{app.professional.name}</span>
                        </div>
                        <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white italic">{app.service.name}</h3>
                        
                        <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {formatDateBR(app.startAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {formatTimeBR(app.startAt)} ({app.service.durationMin} min)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center">
                        {isCancelable && (
                          <>
                            <button
                              onClick={() => openReschedule(app)}
                              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-black uppercase tracking-widest text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-705 transition-colors cursor-pointer"
                            >
                              Reagendar
                            </button>
                            {canCancel ? (
                              <button
                                onClick={() => handleCancelApp(app.id)}
                                className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-black uppercase tracking-widest text-red-600 dark:bg-red-950/20 dark:text-red-400 transition-colors cursor-pointer border border-transparent"
                              >
                                Cancelar
                              </button>
                            ) : (
                              <span
                                className="px-3 py-2 text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-850 rounded-xl cursor-help uppercase tracking-wider"
                                title={`Cancelamento só permitido com antecedência de ${minHours}h`}
                              >
                                Bloqueado para desmarcar
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ABA PRODUTOS (CATÁLOGO + HISTÓRICO) */}
        {activeTab === "products" && (
          <section className="space-y-8">
            
            {/* NOVO PEDIDO / CATÁLOGO */}
            <div className="space-y-4">
              <h2 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Reservar Produtos</h2>
              
              {catalog.length === 0 ? (
                <div className="rounded-3xl bg-zinc-100 dark:bg-zinc-900 p-6 text-center text-sm font-bold text-zinc-400">
                  Nenhum produto cadastrado no catálogo atualmente.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {catalog.map((prod) => {
                    const quantity = cart[prod.id] || 0;
                    return (
                      <div
                        key={prod.id}
                        className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 flex gap-4"
                      >
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-zinc-100" />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm font-black text-zinc-900 dark:text-white">{prod.name}</h4>
                            {prod.description && <p className="text-[11px] font-bold text-zinc-500 leading-tight mt-0.5">{prod.description}</p>}
                          </div>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-sm font-black text-zinc-900 dark:text-white italic">{formatCurrency(prod.price)}</span>
                            
                            {prod.stockQuantity > 0 ? (
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => updateCart(prod.id, -1, prod.stockQuantity)}
                                  className="h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-50 active:scale-90 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-xs font-black text-zinc-900 dark:text-white w-4 text-center">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCart(prod.id, 1, prod.stockQuantity)}
                                  className="h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-50 active:scale-90 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-red-500">Sem Estoque</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CARRINHO FLUTUANTE / AVISO */}
            {cartTotalItems > 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-zinc-900 text-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black italic">Você tem {cartTotalItems} {cartTotalItems === 1 ? "produto" : "produtos"} no carrinho</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Total: {formatCurrency(cartTotalValue)}</p>
                  </div>
                </div>

                <button
                  onClick={handleReserveProducts}
                  disabled={loading}
                  className="px-6 h-12 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Confirmar Reserva
                </button>
              </div>
            )}

            {/* MINHAS RESERVAS */}
            <div className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
              <h3 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Minhas Reservas</h3>

              {reservations.length === 0 ? (
                <div className="rounded-3xl bg-white border border-zinc-250 dark:bg-zinc-900 dark:border-zinc-800 p-8 text-center text-xs font-bold text-zinc-400">
                  Nenhuma reserva efetuada ainda.
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((res) => {
                    const total = res.items.reduce((sum, item) => sum + item.priceAtReservation * item.quantity, 0);
                    return (
                      <div
                        key={res.id}
                        className="rounded-[2.2rem] border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reserva ID: {res.id.slice(-8).toUpperCase()}</span>
                            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">Efetuada em: {formatDateBR(res.createdAt)}</div>
                          </div>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(res.status)}`}>
                            {translateStatus(res.status)}
                          </span>
                        </div>

                        {/* Itens */}
                        <div className="space-y-2">
                          {res.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs font-bold">
                              <span className="text-zinc-600 dark:text-zinc-300">
                                {item.product.name} <span className="text-zinc-400">x{item.quantity}</span>
                              </span>
                              <span className="text-zinc-900 dark:text-white">{formatCurrency(item.priceAtReservation * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total da Reserva</span>
                          <span className="text-sm font-black italic text-zinc-900 dark:text-white">{formatCurrency(total)}</span>
                        </div>

                        {(res.status === "PENDING" || res.status === "CONFIRMED") && (
                          <div className="mt-3 flex justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
                            <button
                              type="button"
                              onClick={() => handleCancelReservation(res.id)}
                              className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-black uppercase tracking-widest text-red-600 dark:bg-red-950/20 dark:text-red-400 transition-colors cursor-pointer border border-transparent"
                            >
                              Cancelar Reserva
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ABA CLUBE */}
        {activeTab === "club" && tenant.clubEnabled && (
          <section className="space-y-6">
            <h2 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Clube de Benefícios</h2>

            {subscriptions.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-12 text-center">
                <p className="text-sm font-bold text-zinc-400">Você ainda não faz parte do nosso clube VIP.</p>
                <Link
                  href={`/s/${slug}/clube`}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider text-white px-6 transition-all hover:opacity-90 cursor-pointer shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  Conhecer planos
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(sub.status)}`}>
                          {translateStatus(sub.status)}
                        </span>
                        <h3 className="text-xl font-black italic text-zinc-900 dark:text-white mt-2">{sub.plan.name}</h3>
                      </div>
                      <span className="text-lg font-black text-zinc-900 dark:text-white italic">{formatCurrency(sub.plan.priceInCents)}</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 text-xs font-bold text-zinc-500 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                      <div>
                        <div className="text-[10px] font-black uppercase text-zinc-400">Próxima renovação</div>
                        <div className="text-zinc-800 dark:text-zinc-200 mt-1">{formatDateBR(sub.currentPeriodEnd)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-zinc-400">Benefício Ativo</div>
                        <div className="text-zinc-800 dark:text-zinc-200 mt-1">
                          {sub.plan.discountPercent ? `${sub.plan.discountPercent}% de desconto` : "Serviços incluídos"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
