"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBR } from "@/lib/date";
import {
  Calendar,
  Clock,
  Scissors,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  XCircle,
  CalendarDays,
  User,
  ChevronDown,
  Megaphone,
  Plus,
  UserPlus,
  X,
  ArrowRight,
  Sliders,
  AlignLeft, // <-- Ícone adicionado
  Phone,      // <-- Ícone adicionado
  Crown,
  BadgePercent
} from "lucide-react";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  client: { name: string; phoneE164: string };
  service: { name: string; price: number; durationMin: number };
  professional: { id: string; name: string; userId?: string };
  clubSubscriptionId?: string | null;
  clubPlanName?: string | null;
  clubOriginalPrice?: number | null;
  clubDiscountAmount?: number | null;
  clubFinalPrice?: number | null;
};

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

type Professional = { id: string; name: string; userId?: string };
type Service = { id: string; name: string; price: number; durationMin: number };

type ResponseData = {
  tenant: { id: string; name: string };
  appointments: Appointment[];
  professionals: Professional[];
  services?: Service[];
  announcement?: { content: string } | null;
};

// --- FUNÇÃO PARA GERAR A GRADE DE HORÁRIOS ---
const generateTimeSlots = (startHour: number, endHour: number, intervalMinutes: number) => {
  const slots = [];
  let current = new Date();
  current.setHours(startHour, 0, 0, 0);

  const end = new Date();
  end.setHours(endHour, 0, 0, 0);

  while (current <= end) {
    slots.push(current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  return slots;
};

export default function AdminAppointmentsClient({ slug, isMaster }: { slug: string; isMaster?: boolean }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfId, setActiveProfId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // --- NOVO ESTADO: Configuração da Grade ---
  const [intervalMin, setIntervalMin] = useState<number>(30);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    clientName: "",
    clientPhone: "",
    serviceId: "",
    professionalId: "",
    date: "",
    time: ""
  });

  const [date, setDate] = useState(() => {
    return formatBR(new Date(), "yyyy-MM-dd");
  });

  async function loadAppointments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/appointments?date=${date}`, { cache: 'no-store' });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Erro ao carregar");
      setData(json);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
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
      if (!res.ok) throw new Error("Erro ao atualizar");
      await loadAppointments();
    } catch (err) { alert("Erro ao atualizar o agendamento."); } finally { setUpdatingId(null); }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${slug}/appointments/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm)
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
        time: ""
      });
      setIsModalOpen(false);
      await loadAppointments();

    } catch (err: any) {
      alert(err.message || "Erro ao criar agendamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); }, [slug, date]);

  // Trava o scroll do body quando o modal abre
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    // Cleanup: garante que o scroll volte se o componente for desmontado
    return () => {
      document.body.style.overflow = 'unset'; document.body.style.position = ''; document.body.style.width = '';
    };
  }, [isModalOpen]);

  const professionalAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    const apps = activeProfId ? data.appointments.filter(a => a.professional.id === activeProfId) : data.appointments;
    return [...apps].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [data, activeProfId]);

  // --- TIMELINE INTELIGENTE (Filtra passado e sobreposições) ---
  const timelineData = useMemo(() => {
    const allPossibleSlots = generateTimeSlots(8, 20, intervalMin);
    const apps = professionalAppointments.filter(a => a.status !== "CANCELED" && a.status !== "COMPLETED");

    // 1. Verificamos se a data selecionada no painel é hoje
    const todayStr = formatBR(new Date(), "yyyy-MM-dd");
    const isToday = date === todayStr;

    // 2. Pegamos a hora e minuto atual para comparar
    const now = new Date();
    const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();

    return allPossibleSlots.map((slotTime, index) => {
      const [slotH, slotM] = slotTime.split(':').map(Number);
      const slotTotalMinutes = (slotH * 60) + slotM;

      // 🚩 REGRA DE OURO: Se for hoje e o horário já passou, esconde o slot livre
      if (isToday && slotTotalMinutes < currentTotalMinutes) {
        // Se não houver agendamento nesse horário passado, retornamos null (some da tela)
        const hasApp = apps.find(a => formatBR(a.startAt, "HH:mm") === slotTime);
        if (!hasApp) return null;
      }

      // Monta os horários exatos para comparar
      const slotStart = new Date(`${date}T${slotTime}:00-03:00`).getTime();
      const slotEnd = slotStart + (intervalMin * 60000);

      // Procura se esse slot conflita com algum agendamento existente
      const conflictingApp = apps.find(a => {
        const appStart = new Date(a.startAt).getTime();
        const appEnd = new Date(a.endAt).getTime();
        return appStart < slotEnd && appEnd > slotStart; // Checa sobreposição de horários
      });

      if (conflictingApp) {
        // Se o slot bater exatamente com o início, desenha o card do cliente
        if (formatBR(conflictingApp.startAt, "HH:mm") === slotTime) {
          return { ...conflictingApp, isFree: false };
        }
        // Se o slot estiver "no meio" do tempo de um corte, ele some (retorna null)
        return null;
      }

      // Se passou por tudo e não tem conflito, é um horário livre
      return {
        id: `free-${slotTime}-${index}`,
        isFree: true,
        time: slotTime
      };
    }).filter(Boolean); // O filter(Boolean) remove os "nulls" gerados acima da lista final
  }, [professionalAppointments, date, intervalMin]);

  const stats = useMemo(() => {
    const apps = professionalAppointments;
    return {
      total: apps.length,
      confirmed: apps.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING").length,
      completed: apps.filter((a) => a.status === "COMPLETED").length,
      canceled: apps.filter((a) => a.status === "CANCELED").length,
    };
  }, [professionalAppointments]);

  const visibleAppointmentsCount = useMemo(() => {
    return professionalAppointments.filter((a) => a.status !== "CANCELED" && a.status !== "COMPLETED").length;
  }, [professionalAppointments]);

  if (loading && !data) return (
    <div className="p-10 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-bold italic">
      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
      Sincronizando Agenda...
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-20 relative antialiased">

      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none transition-opacity duration-300 ${isModalOpen ? 'opacity-100' : 'opacity-0'}`} />

      {/* 1. AVISO GLOBAL */}
      {data?.announcement && (
        <div className="bg-emerald-600 text-white p-5 sm:py-4 sm:px-6 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 shadow-xl shadow-emerald-500/20 border border-emerald-400/30">
          <div className="bg-white/20 p-2.5 sm:p-2 rounded-xl shrink-0">
            <Megaphone className="h-6 w-6 sm:h-5 sm:w-5" />
          </div>
          <p className="font-bold text-xs sm:text-sm uppercase tracking-wide text-center sm:text-left leading-relaxed">
            {data.announcement.content}
          </p>
        </div>
      )}

      {/* HEADER & DATE PICKER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-xs">
            <CalendarDays className="h-4 w-4" /> Painel Interno
          </div>
          <h2 className="mt-2 text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter">
            {data?.tenant.name || "Sua Barbearia"}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus size={18} /> Novo Agendamento
          </button>

          {/* SELETOR DE INTERVALO (GRADE) */}
          <div className="relative group w-full sm:w-auto">
            <select
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
              <option value={15}>Grade: 15 min</option>
              <option value={20}>Grade: 20 min</option>
              <option value={30}>Grade: 30 min</option>
              <option value={40}>Grade: 40 min</option>
              <option value={45}>Grade: 45 min</option>
              <option value={60}>Grade: 60 min</option>
            </select>
            <button className="w-full flex justify-between lg:justify-start items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all bg-white border border-zinc-200 text-zinc-900 group-hover:border-emerald-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:group-hover:border-emerald-500 shadow-xl shadow-zinc-200/50 dark:shadow-none uppercase tracking-widest text-sm">
              <div className="flex items-center gap-3">
                <Sliders size={20} className="text-emerald-500" />
                <span>{intervalMin} MIN</span>
              </div>
              <ChevronDown size={16} className="text-zinc-400" />
            </button>
          </div>

          {/* SELETOR DE DATA */}
          <div className="relative group w-full sm:w-auto">
            <input type="date" value={date} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <button className="w-full flex justify-between lg:justify-start items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all bg-white border border-zinc-200 text-zinc-900 group-hover:border-emerald-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:group-hover:border-emerald-500 shadow-xl shadow-zinc-200/50 dark:shadow-none uppercase tracking-widest text-sm">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-emerald-500" />
                <span>{date.split('-').reverse().join('/')}</span>
              </div>
              <ChevronDown size={16} className="text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* GRID DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total do Dia", value: stats.total, color: "text-zinc-900 dark:text-white" }, { label: "Agendados", value: stats.confirmed, color: "text-emerald-600 dark:text-emerald-400" }, { label: "Finalizados", value: stats.completed, color: "text-blue-600 dark:text-blue-400" }, { label: "Cancelados", value: stats.canceled, color: "text-red-600 dark:text-red-500" }].map(stat => (
          <div key={stat.label} className="rounded-3xl p-6 bg-white border border-zinc-200 shadow-xl shadow-zinc-200/30 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
            <p className={`text-[10px] font-black uppercase tracking-widest ${stat.color === 'text-zinc-900 dark:text-white' ? 'text-zinc-400' : stat.color}`}>{stat.label}</p>
            <p className={`mt-1 text-3xl font-black ${stat.color} italic`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* TIMELINE */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Atendimentos na Timeline</h3>
          <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1 rounded-full">
            {visibleAppointmentsCount} na fila
          </span>
        </div>

        {timelineData.length > 0 ? (
          <div className="grid gap-4">
            {timelineData.map((item: any) => {
              if (item.isFree) {
                return (
                  // --- SLOT LIVRE ---
                  <div
                    key={item.id}
                    className="group flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-white dark:hover:bg-zinc-900 hover:border-emerald-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-zinc-400 dark:text-zinc-500 w-12">{item.time}</span>
                      <div className="h-4 w-[2px] bg-zinc-200 dark:bg-zinc-800" />
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Disponível</span>
                    </div>

                    <button
                      onClick={() => {
                        setManualForm({
                          ...manualForm,
                          time: item.time,
                          date: date
                        });
                        setIsModalOpen(true);
                      }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={14} /> Reservar
                    </button>
                  </div>
                );
              }

              const hasClubReference = Boolean(item.clubSubscriptionId || item.clubPlanName);

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

              const finalPriceToDisplay = hasClubReference && typeof item.clubFinalPrice === "number"
                ? item.clubFinalPrice
                : item.service.price;

              return (
                // --- CARD DE AGENDAMENTO ---
                /* --- CARD DE AGENDAMENTO COMPACTO NO MOBILE --- */
                <div key={item.id} className="group flex flex-col lg:flex-row bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/40 dark:shadow-none overflow-hidden transition-all hover:border-emerald-500/50">
                  {/* LADO ESQUERDO: HORÁRIO */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 flex lg:flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 lg:w-48 text-center">
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-0.5 sm:mb-1">Horário</p>
                      <p className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter leading-none">
                        {formatBR(item.startAt, "HH:mm")}
                      </p>
                    </div>
                    {activeProfId === null && (
                      <div className="mt-0 lg:mt-4 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                        <Scissors size={12} /> {item.professional.name.split(' ')[0]}
                      </div>
                    )}
                  </div>

                  {/* CONTEÚDO CENTRAL: CLIENTE E SERVIÇO */}
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <h4 className="font-black text-lg sm:text-2xl text-zinc-900 dark:text-white uppercase leading-tight truncate">
                        {item.client.name}
                      </h4>
                      {item.client.phoneE164 && (
                        <a
                          href={`https://wa.me/${item.client.phoneE164.replace(/\D/g, '')}`}
                          target="_blank"
                          className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl lg:hidden"
                        >
                          <MessageCircle size={18} />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-0 sm:mb-4">
                      {[
                        { Icon: Scissors, text: item.service.name },
                        { Icon: Clock, text: `${item.service.durationMin || 0} min` },
                        { Icon: DollarSign, text: formatCurrency(finalPriceToDisplay) }
                      ].map(badge => (
                        <span key={badge.text} className="flex items-center gap-1 text-[9px] sm:text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                          <badge.Icon size={12} /> {badge.text}
                        </span>
                      ))}
                    </div>

                    {/* --- BLOCO DO CLUBE DE ASSINATURAS --- */}
                    {hasClubReference && (
                      <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown size={14} className="text-amber-600 dark:text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                            {usedIncludedBenefit && "Benefício incluso utilizado"}
                            {usedClubPercentDiscount && "Desconto do clube aplicado"}
                            {clubValidatedButNoAppliedBenefit && "Assinatura do clube identificada"}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                            {item.clubPlanName && (
                              <div className="col-span-2 sm:col-span-3">
                                <p className="text-[8px] font-bold text-amber-600/70 uppercase">Plano</p>
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.clubPlanName}</p>
                              </div>
                            )}
                            {(usedIncludedBenefit || usedClubPercentDiscount) && (
                              <>
                                <div>
                                  <p className="text-[8px] font-bold text-amber-600/70 uppercase">Original</p>
                                  <p className="text-xs font-bold text-zinc-500 line-through">
                                    {formatCurrency(item.clubOriginalPrice || 0)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[8px] font-bold text-amber-600/70 uppercase">Desconto</p>
                                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                    <BadgePercent size={10} /> -{formatCurrency(item.clubDiscountAmount || 0)}
                                  </p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <p className="text-[8px] font-bold text-amber-600/70 uppercase">Valor Final</p>
                                  <p className="text-sm font-black text-amber-700 dark:text-amber-400 italic">
                                    {formatCurrency(item.clubFinalPrice || 0)}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          {clubValidatedButNoAppliedBenefit && (
                            <div className="pt-2 border-t border-amber-500/10">
                              <p className="text-[9px] font-medium text-amber-700/80 dark:text-amber-400/80 italic">Sem benefício aplicado neste agendamento.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* --- INÍCIO: BOX DE OBSERVAÇÕES E CONTATO --- */}
                  {(item.notes || item.client.phoneE164) && (
                    <div className="mt-4 p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                      {/* MOSTRA O NÚMERO */}
                      {item.client.phoneE164 && (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            <Phone size={14} className="text-emerald-500" />
                            {item.client.phoneE164}
                          </div>

                          {/* BOTÃO DO WHATSAPP */}
                          <a
                            href={`https://wa.me/${item.client.phoneE164.replace(/\D/g, '')}`}
                            target="_blank"
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md shadow-emerald-500/10"
                          >
                            <MessageCircle size={14} /> Chamar
                          </a>
                        </div>
                      )}

                      {/* MOSTRA AS OBSERVAÇÕES */}
                      {item.notes && (
                        <div className="pt-2 mt-1 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1 flex items-center gap-1">
                            <AlignLeft size={12} /> Observações do Cliente
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 italic">
                            "{item.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* --- FIM: BOX DE OBSERVAÇÕES E CONTATO --- */}

                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="p-4 sm:p-6 bg-zinc-50/50 dark:bg-zinc-950/30 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800 flex flex-row lg:flex-col gap-2 sm:gap-3 justify-center">
                  <button disabled={updatingId === item.id} onClick={() => handleStatusChange(item.id, "COMPLETED")} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 sm:py-4 rounded-2xl text-[10px] sm:text-sm font-black uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                    {updatingId === item.id ? <span className="animate-pulse">...</span> : <><CheckCircle2 size={16} className="sm:w-[18px]" /> Finalizar</>}
                  </button>
                  <button disabled={updatingId === item.id} onClick={() => { if (confirm("Deseja cancelar?")) handleStatusChange(item.id, "CANCELED"); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-500 px-4 py-3 sm:py-4 rounded-2xl text-[10px] font-black uppercase disabled:opacity-50">
                    <XCircle size={14} className="sm:w-[16px]" /> Cancelar
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-16 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 shadow-sm transition-colors">
            <CalendarDays className="h-10 w-10 text-emerald-500 mb-6" />
            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Agenda Livre</h3>
            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Nenhum atendimento para hoje</p>
          </div>
        )}
      </section>

      {/* MODAL DE AGENDAMENTO MANUAL - ULTRA COMPACTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2rem] p-5 sm:p-8 max-h-[92vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
                <UserPlus className="h-5 w-5 text-zinc-950" />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white leading-none">
                  Novo <span className="text-emerald-500">Agendamento</span>
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Balcão Direto</p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              {/* CLIENTE (LINHA ÚNICA) */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome do Cliente</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input type="text" value={manualForm.clientName} onChange={(e) => setManualForm({ ...manualForm, clientName: e.target.value })} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl pl-10 pr-4 text-xs font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 border-none" placeholder="Ex: Francisco" required />
                </div>
              </div>

              {/* WHATSAPP E DATA */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">WhatsApp</label>
                  <input
                    type="tel"
                    value={manualForm.clientPhone}
                    onChange={(e) => setManualForm({ ...manualForm, clientPhone: e.target.value })}
                    className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-3 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Data</label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-2 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none"
                    required
                  />
                </div>
              </div>

              {/* HORÁRIO E BARBEIRO */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Horário</label>
                  <input
                    type="time"
                    value={manualForm.time}
                    onChange={(e) => setManualForm({ ...manualForm, time: e.target.value })}
                    className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-3 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Barbeiro</label>
                  <select
                    value={manualForm.professionalId}
                    onChange={(e) => setManualForm({ ...manualForm, professionalId: e.target.value })}
                    className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-3 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none"
                    required
                  >
                    <option value="">Quem?</option>
                    {data?.professionals?.map(p => <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>)}
                  </select>
                </div>
              </div>

              {/* SERVIÇO (LINHA ÚNICA) */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Serviço</label>
                <select value={manualForm.serviceId} onChange={(e) => setManualForm({ ...manualForm, serviceId: e.target.value })} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-4 text-xs font-bold text-zinc-900 dark:text-white border-none appearance-none" required>
                  <option value="">Escolha o serviço...</option>
                  {data?.services?.map(s => <option key={s.id} value={s.id}>{s.name} - R${(s.price / 100).toFixed(2)}</option>)}
                </select>
              </div>

              <button type="submit" disabled={loading} className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 mt-4">
                {loading ? <span className="animate-pulse">Salvando...</span> : <>Confirmar Agendamento <ArrowRight size={14} /></>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}