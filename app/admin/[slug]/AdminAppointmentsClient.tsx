"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatBR } from "@/lib/date";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  AlignLeft,
  ArrowRight,
  BadgePercent,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  DollarSign,
  MessageCircle,
  Megaphone,
  Phone,
  Plus,
  RefreshCcw,
  Scissors,
  Sliders,
  User,
  UserPlus,
  X,
  XCircle,
  ShoppingBag,
  Coffee,
} from "lucide-react";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  client: { 
    name: string; 
    phoneE164: string;
    noShowCount?: number;
    lateCancelCount?: number;
    completedCount?: number;
  };
  service: { name: string; price: number; durationMin: number };
  professional: { id: string; name: string; imageUrl?: string | null; userId?: string };
  clubSubscriptionId?: string | null;
  clubPlanName?: string | null;
  clubOriginalPrice?: number | null;
  clubDiscountAmount?: number | null;
  clubFinalPrice?: number | null;
  presenceConfirmed?: boolean;
};

type Professional = { id: string; name: string; imageUrl?: string | null; userId?: string };
type Service = { id: string; name: string; price: number; durationMin: number };

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
  client: {
    name: string;
    phoneE164: string;
  };
  items: ReservationItem[];
};

type BusinessHour = {
  id: string;
  weekday: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
  isOpen: boolean;
  startMin: number | null;
  endMin: number | null;
};

type ScheduleBlock = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  professionalId: string | null;
};

type ResponseData = {
  tenant: { id: string; name: string };
  appointments: Appointment[];
  professionals: Professional[];
  services?: Service[];
  announcement?: { content: string } | null;
  productReservations?: ProductReservation[];
  businessHours?: BusinessHour[];
  blocks?: ScheduleBlock[];
};

type TimelineAppointmentItem = Appointment & { isFree: false };
type TimelineFreeItem = { id: string; isFree: true; time: string };
type TimelineItem = TimelineAppointmentItem | TimelineFreeItem;

const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-zinc-500";

const shellCardClass =
  "rounded-3xl sm:rounded-[2rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

const innerCardClass =
  "rounded-[1.75rem] border border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950";

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function reservationStatusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "PICKED_UP":
      return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-950 dark:bg-amber-500/15 dark:text-amber-400";
    case "CANCELED":
      return "border-red-200 bg-red-100 text-red-700 dark:border-red-950 dark:bg-red-500/15 dark:text-red-400";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

function translateReservationStatus(status: string) {
  const dict: Record<string, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmada",
    CANCELED: "Cancelada",
    PICKED_UP: "Retirado / Entregue",
  };
  return dict[status] || status;
}

const generateTimeSlots = (
  startMin: number,
  endMin: number,
  intervalMinutes: number
) => {
  const slots: string[] = [];
  const current = new Date();
  current.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

  const end = new Date();
  end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

  while (current < end) {
    slots.push(
      current.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
};

export default function AdminAppointmentsClient({
  slug,
  isMaster,
}: {
  slug: string;
  isMaster?: boolean;
}) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfId, setActiveProfId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [intervalMin, setIntervalMin] = useState<number>(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"appointments" | "reservations">("appointments");
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);

  const [manualForm, setManualForm] = useState({
    clientName: "",
    clientPhone: "",
    serviceId: "",
    professionalId: "",
    date: "",
    time: "",
  });

  const [date, setDate] = useState(() => formatBR(new Date(), "yyyy-MM-dd"));

  async function loadAppointments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/appointments?date=${date}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar");
      }

      setData({
        ...json,
        appointments: Array.isArray(json.appointments) ? json.appointments : [],
        professionals: Array.isArray(json.professionals) ? json.professionals : [],
        services: Array.isArray(json.services) ? json.services : [],
        productReservations: Array.isArray(json.productReservations) ? json.productReservations : [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateReservationStatus(resId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/${slug}/products/reservations/${resId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Erro ao atualizar status");
      }

      await loadAppointments();
    } catch (err: any) {
      window.alert(err.message || "Erro ao atualizar status da reserva.");
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/admin/${slug}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Erro ao atualizar");
      }

      await loadAppointments();
    } catch {
      window.alert("Erro ao atualizar o agendamento.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCompleteAll() {
    if (!window.confirm("Tem certeza que deseja finalizar todos os agendamentos deste dia?")) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao finalizar agendamentos");
      }

      await loadAppointments();
    } catch (err: any) {
      window.alert(err.message || "Erro ao finalizar agendamentos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/${slug}/appointments/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro na API");
      }

      setManualForm({
        clientName: "",
        clientPhone: "",
        serviceId: "",
        professionalId: "",
        date: "",
        time: "",
      });

      setIsModalOpen(false);
      await loadAppointments();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : "Erro ao criar agendamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, [slug, date]);

  useEffect(() => {
    const shouldLock = isModalOpen || isPatchNotesOpen;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    return () => {
      document.body.style.overflow = "unset";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isModalOpen, isPatchNotesOpen]);

  useEffect(() => {
    const seen = localStorage.getItem("trato_patch_notes_v2.0_seen");
    if (!seen) {
      setIsPatchNotesOpen(true);
    }
  }, []);

  const professionals = data?.professionals ?? [];
  const hasMultipleProfessionals = professionals.length > 1;

  useEffect(() => {
    if (!hasMultipleProfessionals) {
      setActiveProfId(null);
    }
  }, [hasMultipleProfessionals]);

  const professionalAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    const apps = activeProfId
      ? data.appointments.filter((a) => a.professional.id === activeProfId)
      : data.appointments;

    return [...apps].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [data, activeProfId]);

  const timelineData = useMemo(() => {
    const WEEKDAYS = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    const [yNum, mNum, dNum] = date.split("-").map(Number);
    const dateObj = new Date(yNum, mNum - 1, dNum);
    const weekdayName = WEEKDAYS[dateObj.getDay()];

    const dayHours = data?.businessHours?.find((h) => h.weekday === weekdayName);
    const startMin = dayHours?.isOpen && dayHours.startMin != null ? dayHours.startMin : 8 * 60;
    const endMin = dayHours?.isOpen && dayHours.endMin != null ? dayHours.endMin : 20 * 60;

    const allPossibleSlots = generateTimeSlots(startMin, endMin, intervalMin);
    const apps = professionalAppointments.filter(
      (a) => a.status !== "CANCELED" && a.status !== "COMPLETED"
    );

    const todayStr = formatBR(new Date(), "yyyy-MM-dd");
    const isToday = date === todayStr;
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    return allPossibleSlots
      .map((slotTime, index) => {
        const [slotH, slotM] = slotTime.split(":").map(Number);
        const slotTotalMinutes = slotH * 60 + slotM;

        if (isToday && slotTotalMinutes < currentTotalMinutes) {
          const hasApp = apps.find((a) => formatBR(a.startAt, "HH:mm") === slotTime);
          if (!hasApp) return null;
        }

        const slotStart = new Date(`${date}T${slotTime}:00-03:00`).getTime();
        const slotEnd = slotStart + intervalMin * 60000;

        const conflictingApp = apps.find((a) => {
          const appStart = new Date(a.startAt).getTime();
          const appEnd = new Date(a.endAt).getTime();
          return appStart < slotEnd && appEnd > slotStart;
        });

        if (conflictingApp) {
          if (formatBR(conflictingApp.startAt, "HH:mm") === slotTime) {
            return { ...conflictingApp, isFree: false } as TimelineAppointmentItem;
          }
          return null;
        }

        return {
          id: `free-${slotTime}-${index}`,
          isFree: true,
          time: slotTime,
        } as TimelineFreeItem;
      })
      .filter(Boolean) as TimelineItem[];
  }, [professionalAppointments, date, intervalMin, data?.businessHours]);

  const stats = useMemo(() => {
    const apps = professionalAppointments;
    const confirmedApps = apps.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING");
    const completedApps = apps.filter((a) => a.status === "COMPLETED");
    const canceled = apps.filter((a) => a.status === "CANCELED").length;
    
    // Calcular capacidade com base em businessHours (de 30 em 30 minutos)
    const WEEKDAYS = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    const [yNum, mNum, dNum] = date.split("-").map(Number);
    const dateObj = new Date(yNum, mNum - 1, dNum);
    const weekdayName = WEEKDAYS[dateObj.getDay()];

    const dayHours = data?.businessHours?.find((h) => h.weekday === weekdayName);
    const startMin = dayHours?.isOpen && dayHours.startMin != null ? dayHours.startMin : 8 * 60;
    const endMin = dayHours?.isOpen && dayHours.endMin != null ? dayHours.endMin : 20 * 60;

    const allPossibleSlots = generateTimeSlots(startMin, endMin, 30);
    const activeProfsCount = activeProfId ? 1 : (data?.professionals?.length || 1);
    const totalCapacity = allPossibleSlots.length * activeProfsCount;
    
    // Ocupado: Somatória dos tempos dos agendamentos ativos em slots de 30 minutos
    const activeApps = [...confirmedApps, ...completedApps];
    const totalMinutesBooked = activeApps.reduce((acc, app) => acc + (app.service?.durationMin || 30), 0);
    const occupied = Math.ceil(totalMinutesBooked / 30);
    const ratePercentage = totalCapacity > 0 ? Math.min(100, (occupied / totalCapacity) * 100) : 0;
    
    return {
      total: apps.length,
      confirmed: confirmedApps.length,
      completed: completedApps.length,
      canceled,
      rate: ratePercentage,
      occupied,
      totalCapacity
    };
  }, [professionalAppointments, activeProfId, data?.professionals, date, data?.businessHours]);

  const visibleAppointmentsCount = useMemo(() => {
    return professionalAppointments.filter(
      (a) => a.status !== "CANCELED" && a.status !== "COMPLETED"
    ).length;
  }, [professionalAppointments]);

  const hasCompletableAppointments = useMemo(() => {
    return data?.appointments?.some(
      (a) => a.status === "PENDING" || a.status === "CONFIRMED"
    ) ?? false;
  }, [data]);

  const isRestDay = useMemo(() => {
    if (!data?.businessHours || !date) return null;

    const WEEKDAYS = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];

    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const weekdayName = WEEKDAYS[d.getDay()];

    const dayHours = data.businessHours.find((h) => h.weekday === weekdayName);
    if (dayHours && !dayHours.isOpen) {
      return { type: "closed", message: "O salão não abre neste dia da semana. Aproveite o seu dia de folga para descansar! ☕" };
    }

    const generalBlocks = data.blocks?.filter((b) => b.professionalId === null) || [];
    if (generalBlocks.length > 0) {
      const allDayBlock = generalBlocks.find((b) => b.allDay);
      if (allDayBlock) {
        return { type: "blocked", message: `Dia bloqueado na agenda do salão: "${allDayBlock.title}". Bom descanso! 💤` };
      }
      const firstBlock = generalBlocks[0];
      return { type: "blocked", message: `Bloqueio geral ativo: "${firstBlock.title}". Bom descanso!` };
    }

    return null;
  }, [data?.businessHours, data?.blocks, date]);

  if (loading && !data) {
    return (
      <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="relative flex min-h-screen items-center gap-3 px-6 text-zinc-800 dark:text-zinc-200">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="font-black italic tracking-tight">
            Sincronizando Agenda...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 p-4 pb-20 antialiased sm:p-6">
      <div className="fixed top-0 left-1/2 h-[500px] w-full -translate-x-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {data?.announcement && (
        <div className="relative rounded-3xl border border-emerald-400/30 bg-emerald-600 p-5 text-white shadow-xl shadow-emerald-500/20 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="shrink-0 rounded-xl bg-white/20 p-2.5 sm:p-2">
              <Megaphone className="h-6 w-6 sm:h-5 sm:w-5" />
            </div>
            <p className="text-center text-xs font-bold uppercase leading-relaxed tracking-wide sm:text-left sm:text-sm">
              {data.announcement.content}
            </p>
          </div>
        </div>
      )}

      <section className={shellCardClass}>
        <div className="border-b border-zinc-200 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent px-5 py-6 dark:border-zinc-800 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  <CalendarDays className="h-4 w-4" />
                  Painel interno
                </div>
                <h2 className="mt-2 text-[1.75rem] leading-[1.05] font-black italic tracking-tighter text-zinc-900 dark:text-white sm:text-4xl">
                  {data?.tenant.name || "Sua Barbearia"}
                </h2>
                {isMaster && (
                  <p className="mt-3 text-[13px] leading-5 font-bold text-zinc-500">
                    Visualização master habilitada.
                  </p>
                )}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 sm:w-auto"
                >
                  <Plus size={16} />
                  Novo Agendamento
                </button>

                <div className="relative group w-full sm:w-auto">
                  <select
                    value={intervalMin}
                    onChange={(e) => setIntervalMin(Number(e.target.value))}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  >
                    <option value={15}>Grade: 15 min</option>
                    <option value={20}>Grade: 20 min</option>
                    <option value={30}>Grade: 30 min</option>
                    <option value={40}>Grade: 40 min</option>
                    <option value={45}>Grade: 45 min</option>
                    <option value={60}>Grade: 60 min</option>
                  </select>
                  <button className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 shadow-xl shadow-zinc-200/50 transition-all group-hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:shadow-none dark:group-hover:border-emerald-500 lg:justify-start">
                    <div className="flex items-center gap-2.5">
                      <Sliders size={18} className="text-emerald-500" />
                      <span>{intervalMin} MIN</span>
                    </div>
                    <ChevronDown size={14} className="text-zinc-400" />
                  </button>
                </div>

                <div className="relative group w-full sm:w-auto">
                  <input
                    type="date"
                    value={date}
                    onClick={(e) => e.currentTarget.showPicker()}
                    onChange={(e) => setDate(e.target.value)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <button className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-900 shadow-xl shadow-zinc-200/50 transition-all group-hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:shadow-none dark:group-hover:border-emerald-500 lg:justify-start">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={18} className="text-emerald-500" />
                      <span>{date.split("-").reverse().join("/")}</span>
                    </div>
                    <ChevronDown size={14} className="text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>

            {professionals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hasMultipleProfessionals ? (
                  <>
                    <button
                      onClick={() => setActiveProfId(null)}
                      className={`rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        activeProfId === null
                          ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      Todos
                    </button>

                    {professionals.map((prof) => (
                      <button
                        key={prof.id}
                        onClick={() => setActiveProfId(prof.id)}
                        className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                          activeProfId === prof.id
                            ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        <div className="relative h-6 w-6 rounded-full overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-black/10">
                          {prof.imageUrl ? (
                            <img src={prof.imageUrl} alt={prof.name} className="absolute inset-0 h-full w-full object-cover rounded-full" />
                          ) : (
                            <User className="h-full w-full p-1 text-zinc-400" />
                          )}
                        </div>
                        {prof.name}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="rounded-2xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-950 shadow-lg shadow-emerald-500/20">
                    {professionals[0]?.name}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* VIEW DESKTOP */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {/* CARD 1: Taxa de Ocupação */}
        <div className={`${shellCardClass} p-6 flex flex-col items-center justify-center`}>
          <p className={`${labelClass} mb-4 text-center`}>Taxa de Ocupação</p>
          
          <div className="relative flex items-center justify-center h-32 w-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-emerald-500 transition-all duration-500 ease-out"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.rate / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
                {stats.rate.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <p className="mt-4 text-[10px] font-bold text-zinc-400 text-center">
            {stats.occupied} de {stats.totalCapacity} horários preenchidos
          </p>
        </div>

        {/* CARD 2: Distribuição de Agendamentos */}
        <div className={`${shellCardClass} p-6 col-span-2 flex flex-col justify-between`}>
          <div>
            <p className={`${labelClass} mb-6`}>Distribuição dos Agendamentos</p>
          </div>
          
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { name: "Agendados", quantidade: stats.confirmed, fill: "#10b981" },
                  { name: "Finalizados", quantidade: stats.completed, fill: "#3b82f6" },
                  { name: "Cancelados", quantidade: stats.canceled, fill: "#ef4444" },
                ]}
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontWeight: 700, fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                  formatter={(value: any) => [value, "Quantidade"]}
                />
                <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} barSize={20} {...({} as any)}>
                  {[
                    { fill: "#10b981" },
                    { fill: "#3b82f6" },
                    { fill: "#ef4444" },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-2">
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                Agendados ({stats.confirmed})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
                Finalizados ({stats.completed})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                Cancelados ({stats.canceled})
              </span>
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-400">
              Total: {stats.total}
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MOBILE COMPACTA */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-emerald-500"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.rate / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-black italic tracking-tighter text-zinc-900 dark:text-white">
              {stats.rate.toFixed(0)}%
            </span>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-tighter">Ocupação</p>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-350">
              {stats.occupied}/{stats.totalCapacity} horários
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 text-[9px] font-black uppercase tracking-widest text-right">
          <span className="text-emerald-600 dark:text-emerald-400">
            {stats.confirmed} Confirmados
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            {stats.completed} Finalizados
          </span>
          <span className="text-red-500">
            {stats.canceled} Cancelados
          </span>
        </div>
      </div>

      {/* TABS MENU */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4 mb-4">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === "appointments"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
          }`}
        >
          Atendimentos
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === "reservations"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
          }`}
        >
          Reservas de Produtos ({(data?.productReservations || []).length})
        </button>
      </div>

      {activeTab === "appointments" ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className={labelClass}>Atendimentos na timeline</h3>
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {visibleAppointmentsCount} na fila
            </span>
          </div>

        {isRestDay ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-[2rem] border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-4 animate-bounce">
              <Coffee size={40} />
            </div>
            <h3 className="text-2xl font-black italic text-zinc-900 dark:text-white">
              Momento de descanso!
            </h3>
            <p className="mt-2 text-sm font-bold text-zinc-500 max-w-md">
              {isRestDay.message}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-zinc-150 hover:bg-zinc-250 text-zinc-850 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-white px-6 py-3 text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={16} />
                Agendar Horário Manual
              </button>
            </div>
          </div>
        ) : timelineData.length > 0 ? (
          <div className="grid gap-4">
            {timelineData.map((item) => {
              if (item.isFree) {
                return (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between rounded-[1.75rem] border-2 border-dashed border-zinc-200 bg-zinc-50/70 p-4 transition-all duration-300 hover:border-emerald-500/50 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/20 dark:hover:bg-zinc-900"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-12 text-sm font-black text-zinc-400 dark:text-zinc-500">
                        {item.time}
                      </span>
                      <div className="h-4 w-[2px] bg-zinc-200 dark:bg-zinc-800" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                        Disponível
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setManualForm((prev) => ({
                          ...prev,
                          time: item.time,
                          date,
                        }));
                        setIsModalOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-100 shadow-sm transition-all hover:border-emerald-500 hover:text-emerald-500 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Plus size={14} />
                      Reservar
                    </button>
                  </div>
                );
              }

              const clientDisplayName =
                item.client?.name?.trim() || item.client?.phoneE164 || "Cliente";

              const hasClubReference = Boolean(
                item.clubSubscriptionId || item.clubPlanName
              );

              const usedIncludedBenefit =
                hasClubReference &&
                typeof item.clubOriginalPrice === "number" &&
                typeof item.clubDiscountAmount === "number" &&
                typeof item.clubFinalPrice === "number" &&
                item.clubOriginalPrice > 0 &&
                item.clubDiscountAmount === item.clubOriginalPrice &&
                item.clubFinalPrice === 0;

              const usedClubPercentDiscount =
                hasClubReference &&
                typeof item.clubDiscountAmount === "number" &&
                typeof item.clubFinalPrice === "number" &&
                item.clubDiscountAmount > 0 &&
                item.clubFinalPrice > 0;

              const clubValidatedButNoAppliedBenefit =
                hasClubReference &&
                !usedIncludedBenefit &&
                !usedClubPercentDiscount;

              const finalPriceToDisplay =
                hasClubReference && typeof item.clubFinalPrice === "number"
                  ? item.clubFinalPrice
                  : item.service.price;

              return (
                <article
                  key={item.id}
                  className={`${shellCardClass} overflow-hidden transition-all hover:border-emerald-500/50`}
                >
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:w-48 lg:flex-col lg:justify-center lg:border-b-0 lg:border-r lg:p-6">
                      <div className="text-center">
                        <p className={labelClass}>Horário</p>
                        <p className="mt-1 text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white sm:text-4xl">
                          {formatBR(item.startAt, "HH:mm")}
                        </p>
                      </div>

                      {activeProfId === null && (
                        <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white pl-1.5 pr-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 lg:mt-4">
                          <div className="h-4 w-4 rounded-full overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                            {item.professional?.imageUrl ? (
                              <img src={item.professional.imageUrl} alt={item.professional.name} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-full w-full p-0.5 text-zinc-400" />
                            )}
                          </div>
                          {item.professional.name.split(" ")[0]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-4 sm:p-6">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h4 className="truncate text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white sm:text-2xl flex items-center gap-2">
                          {clientDisplayName}
                          {item.presenceConfirmed && (
                            <span className="text-emerald-500 bg-emerald-500/10 p-1 rounded-full" title="Presença Confirmada via WhatsApp">
                              <CheckCircle2 size={18} />
                            </span>
                          )}
                        </h4>
                        
                        {/* Attendance Stats */}
                        {(item.client.completedCount !== undefined) && (item.client.completedCount > 0 || item.client.noShowCount! > 0 || item.client.lateCancelCount! > 0) && (
                          <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest mt-1">
                            {item.client.completedCount! > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {item.client.completedCount} atendimentos
                              </span>
                            )}
                            {item.client.noShowCount! > 0 && (
                              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                • {item.client.noShowCount} faltas
                              </span>
                            )}
                            {item.client.lateCancelCount! > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                • {item.client.lateCancelCount} canc. em cima da hora
                              </span>
                            )}
                          </div>
                        )}

                        {/* Removed duplicate small WhatsApp button */}
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                        {[
                          { Icon: Scissors, text: item.service.name },
                          { Icon: Clock, text: `${item.service.durationMin || 0} min` },
                          { Icon: DollarSign, text: formatCurrency(finalPriceToDisplay) },
                        ].map((badge) => (
                          <span
                            key={badge.text}
                            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 sm:px-3 sm:py-1.5 sm:text-xs"
                          >
                            <badge.Icon size={12} />
                            {badge.text}
                          </span>
                        ))}
                      </div>

                      {hasClubReference && (
                        <div className="mb-4 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/10">
                          <div className="mb-2 flex items-center gap-2">
                            <Crown
                              size={14}
                              className="text-amber-600 dark:text-amber-500"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                              {usedIncludedBenefit && "Benefício incluso utilizado"}
                              {usedClubPercentDiscount && "Desconto do clube aplicado"}
                              {clubValidatedButNoAppliedBenefit &&
                                "Assinatura do clube identificada"}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                              {item.clubPlanName && (
                                <div className="col-span-2 sm:col-span-3">
                                  <p className="text-[8px] font-bold uppercase text-amber-600/70">
                                    Plano
                                  </p>
                                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                    {item.clubPlanName}
                                  </p>
                                </div>
                              )}

                              {(usedIncludedBenefit || usedClubPercentDiscount) && (
                                <>
                                  <div>
                                    <p className="text-[8px] font-bold uppercase text-amber-600/70">
                                      Original
                                    </p>
                                    <p className="text-xs font-bold text-zinc-500 line-through">
                                      {formatCurrency(item.clubOriginalPrice || 0)}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[8px] font-bold uppercase text-amber-600/70">
                                      Desconto
                                    </p>
                                    <p className="flex items-center gap-0.5 text-xs font-bold text-emerald-600">
                                      <BadgePercent size={10} />
                                      -{formatCurrency(item.clubDiscountAmount || 0)}
                                    </p>
                                  </div>

                                  <div className="col-span-2 sm:col-span-1">
                                    <p className="text-[8px] font-bold uppercase text-amber-600/70">
                                      Valor final
                                    </p>
                                    <p className="text-sm font-black italic text-amber-700 dark:text-amber-400">
                                      {formatCurrency(item.clubFinalPrice || 0)}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>

                            {clubValidatedButNoAppliedBenefit && (
                              <div className="border-t border-amber-500/10 pt-2">
                                <p className="text-[9px] italic text-amber-700/80 dark:text-amber-400/80">
                                  Sem benefício aplicado neste agendamento.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(item.notes || item.client.phoneE164) && (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50 sm:p-4">
                          {item.client.phoneE164 && (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                <Phone size={14} className="text-emerald-500" />
                                <span className="truncate">
                                  {item.client.phoneE164}
                                </span>
                              </div>

                              <a
                                href={`https://wa.me/${item.client.phoneE164.replace(/\D/g, "")}`}
                                target="_blank"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase text-zinc-950 shadow-md shadow-emerald-500/10 transition-all hover:bg-emerald-600 active:scale-95"
                              >
                                <MessageCircle size={14} />
                                Chamar
                              </a>
                            </div>
                          )}

                          {item.notes && (
                            <div className="mt-1 border-t border-dashed border-zinc-200 pt-2 dark:border-zinc-800">
                              <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                <AlignLeft size={12} />
                                Observações do Cliente
                              </p>
                              <p className="text-xs italic text-zinc-600 dark:text-zinc-400 sm:text-sm">
                                "{item.notes}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-row gap-2 border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30 lg:flex-col lg:justify-center lg:border-t-0 lg:border-l sm:p-6">
                      <button
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, "COMPLETED")}
                        className="flex-1 rounded-2xl bg-emerald-500 px-2 py-2 text-[9px] font-black uppercase text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50 sm:py-3 sm:text-sm"
                      >
                        <span className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                          {updatingId === item.id ? (
                            <span className="animate-pulse">...</span>
                          ) : (
                            <>
                              <CheckCircle2 size={16} className="sm:w-[18px]" />
                              Finalizar
                            </>
                          )}
                        </span>
                      </button>

                      <button
                        disabled={updatingId === item.id}
                        onClick={() => {
                          if (window.confirm("Deseja marcar como Falta (No-show)? O cliente não será notificado.")) {
                            handleStatusChange(item.id, "NOSHOW");
                          }
                        }}
                        className="flex-1 rounded-2xl bg-amber-50 px-2 py-2 text-[9px] font-black uppercase text-amber-600 transition-all hover:bg-amber-500 hover:text-white active:scale-95 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-500 sm:py-3"
                      >
                        <span className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                          Falta
                        </span>
                      </button>

                      <button
                        disabled={updatingId === item.id}
                        onClick={() => {
                          if (window.confirm("Deseja cancelar?")) {
                            handleStatusChange(item.id, "CANCELED");
                          }
                        }}
                        className="flex-1 rounded-2xl bg-red-50 px-2 py-2 text-[9px] font-black uppercase text-red-600 transition-all hover:bg-red-500 hover:text-white active:scale-95 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-500 sm:py-3"
                      >
                        <span className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                          <XCircle size={14} className="sm:w-[14px]" />
                          Cancelar
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            
            {hasCompletableAppointments && (
              <button
                onClick={handleCompleteAll}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-3xl sm:rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                <CheckCircle2 size={18} />
                {loading ? "Finalizando agendamentos..." : "Finalizar Todos os Agendamentos do Dia"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-16 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <CalendarDays className="mb-6 h-10 w-10 text-emerald-500" />
            <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Agenda Livre
            </h3>
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Nenhum atendimento para hoje
            </p>
          </div>
        )}
      </section>
      ) : (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className={labelClass}>Reservas de Produtos</h3>
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {(data?.productReservations || []).length} no total
            </span>
          </div>

          {(data?.productReservations || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-16 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
              <ShoppingBag className="mb-6 h-10 w-10 text-emerald-500" />
              <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Sem Reservas
              </h3>
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                Nenhuma reserva de produto para hoje
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {(data?.productReservations || []).map((res) => {
                const total = res.items.reduce((sum, item) => sum + item.priceAtReservation * item.quantity, 0);
                
                // Formatar link do WhatsApp
                const cleanPhone = res.client.phoneE164?.replace(/\D/g, "");
                const waUrl = cleanPhone 
                  ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=Olá%20${encodeURIComponent(res.client.name)},%20estou%20entrando%20em%20contato%20sobre%20a%20sua%20reserva%20de%20produtos.`
                  : null;

                return (
                  <div
                    key={res.id}
                    className={`${shellCardClass} overflow-hidden transition-all hover:border-emerald-500/50 p-5 sm:p-6 flex flex-col md:flex-row justify-between gap-6`}
                  >
                    {/* Info Cliente & Itens */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                          Reserva: {res.id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-400 font-bold">•</span>
                        <span className="text-xs text-zinc-400 font-bold">
                          {new Date(res.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-black text-lg italic tracking-tight">
                          <User size={18} className="text-emerald-500" />
                          {res.client.name}
                        </div>

                        {res.client.phoneE164 && (
                          <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                            <Phone size={14} />
                            {res.client.phoneE164}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-600 transition-colors ml-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                              >
                                <MessageCircle size={10} /> WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Lista de itens */}
                      <div className="space-y-1.5 pl-6 border-l-2 border-emerald-500/20">
                        {res.items.map((item) => (
                          <div key={item.id} className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                            {item.product.name} <span className="text-zinc-400">x{item.quantity}</span> — {formatCurrency(item.priceAtReservation)} /un
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totais & Status Dropdown */}
                    <div className="flex flex-col md:items-end justify-between shrink-0 gap-4">
                      <div className="md:text-right">
                        <span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest">
                          Total da Reserva
                        </span>
                        <h4 className="text-2xl font-black italic text-zinc-900 dark:text-white mt-1">
                          {formatCurrency(total)}
                        </h4>
                      </div>

                      <div className="space-y-2 w-full md:w-auto">
                        <label className="block text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest">
                          Status da Reserva
                        </label>
                        <div className="relative">
                          <select
                            value={res.status}
                            onChange={(e) => handleUpdateReservationStatus(res.id, e.target.value)}
                            className={`w-full md:w-48 appearance-none rounded-xl border p-3.5 text-[11px] font-black uppercase tracking-wider text-center outline-none cursor-pointer transition-colors ${reservationStatusBadgeClass(res.status)}`}
                          >
                            <option value="PENDING">Pendente</option>
                            <option value="CONFIRMED">Confirmada</option>
                            <option value="PICKED_UP">Retirado / Entregue</option>
                            <option value="CANCELED">Cancelada (Devolve Estoque)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:p-4">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 rotate-3 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
                <UserPlus className="h-5 w-5 text-zinc-950" />
              </div>
              <div>
                <h3 className="leading-none text-lg font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">
                  Novo <span className="text-emerald-500">Agendamento</span>
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Balcão direto
                </p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Nome do Cliente
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={manualForm.clientName}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, clientName: e.target.value })
                    }
                    className="h-11 w-full rounded-xl border-none bg-zinc-100 pl-10 pr-4 text-xs font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-950 dark:text-white"
                    placeholder="Ex: Francisco"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="ml-1 truncate text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={manualForm.clientPhone}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, clientPhone: e.target.value })
                    }
                    className="h-11 w-full appearance-none rounded-xl border-none bg-zinc-100 px-3 text-[11px] font-bold text-zinc-900 outline-none dark:bg-zinc-950 dark:text-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                  <label className="ml-1 truncate text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Data
                  </label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, date: e.target.value })
                    }
                    className="h-11 w-full appearance-none rounded-xl border-none bg-zinc-100 px-2 text-[11px] font-bold text-zinc-900 outline-none dark:bg-zinc-950 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label className="ml-1 truncate text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={manualForm.time}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, time: e.target.value })
                    }
                    className="h-11 w-full appearance-none rounded-xl border-none bg-zinc-100 px-3 text-[11px] font-bold text-zinc-900 outline-none dark:bg-zinc-950 dark:text-white"
                    required
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                  <label className="ml-1 truncate text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Barbeiro
                  </label>
                  <select
                    value={manualForm.professionalId}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        professionalId: e.target.value,
                      })
                    }
                    className="h-11 w-full appearance-none rounded-xl border-none bg-zinc-100 px-3 text-[11px] font-bold text-zinc-900 outline-none dark:bg-zinc-950 dark:text-white"
                    required
                  >
                    <option value="">Quem?</option>
                    {data?.professionals?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.split(" ")[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Serviço
                </label>
                <select
                  value={manualForm.serviceId}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, serviceId: e.target.value })
                  }
                  className="h-11 w-full appearance-none rounded-xl border-none bg-zinc-100 px-4 text-xs font-bold text-zinc-900 outline-none dark:bg-zinc-950 dark:text-white"
                  required
                >
                  <option value="">Escolha o serviço...</option>
                  {data?.services?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R${(s.price / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[10px] font-black uppercase tracking-widest text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95"
              >
                {loading ? (
                  <span className="animate-pulse">Salvando...</span>
                ) : (
                  <>
                    Confirmar Agendamento
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PATCH NOTES V2.0 */}
      {isPatchNotesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-zinc-900 border border-zinc-800 p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Glow verde topo */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[60px] pointer-events-none rounded-full" />
            
            <div className="relative text-center mb-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
                <Megaphone className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-black italic tracking-tighter text-white">
                Trato<span className="text-emerald-500">Marcado</span> v2.0
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mt-1">
                Novidades da Nova Versão
              </p>
            </div>

            {/* Lista de novidades */}
            <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              
              {/* Clientes */}
              <div className="flex gap-3 bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-2xl">
                <span className="text-lg shrink-0">👥</span>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">Aba Clientes Integrada</h4>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed">
                    Dashboard dedicado para gerenciar clientes, monitorar faltas (no-shows) e taxas de cancelamentos recorrentes.
                  </p>
                </div>
              </div>

              {/* Clube & Planos */}
              <div className="flex gap-3 bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-2xl">
                <span className="text-lg shrink-0">👑</span>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">Clube de Assinaturas & Planos</h4>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed">
                    Nova estrutura de planos recorrentes do clube integrados ao Asaas e Mercado Pago com gestão de assinantes.
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex gap-3 bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-2xl">
                <span className="text-lg shrink-0">📊</span>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">Gráficos de Faturamento</h4>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed">
                    Gráficos financeiros aprimorados no painel com comissões, faturamento médio e histórico de usos de benefícios.
                  </p>
                </div>
              </div>

              {/* Recuperação de Senha */}
              <div className="flex gap-3 bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-2xl">
                <span className="text-lg shrink-0">🔑</span>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">Recuperação de Senha</h4>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed">
                    Opção de "Esqueceu a senha?" na tela de login com envio automático de e-mail de redefinição via Resend.
                  </p>
                </div>
              </div>

              {/* Foto de Perfil */}
              <div className="flex gap-3 bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-2xl">
                <span className="text-lg shrink-0">💈</span>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">Perfil de Equipe com Foto</h4>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed">
                    Upload de fotos de perfil para os barbeiros. Avatares visíveis na agenda e na página pública de reservas.
                  </p>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex gap-3 bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-2xl">
                <span className="text-lg shrink-0">✉️</span>
                <div className="text-left">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-200">Notificações automáticas no WhatsApp</h4>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed">
                    Alertas instantâneos confirmando agendamentos e cancelamentos de horários para otimizar os atendimentos.
                  </p>
                </div>
              </div>

            </div>

            <button
              onClick={() => {
                localStorage.setItem("trato_patch_notes_v2.0_seen", "true");
                setIsPatchNotesOpen(false);
              }}
              className="mt-6 w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] cursor-pointer"
            >
              Entendido, vamos lá!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
