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
  Sliders // Ícone novo para o filtro de intervalo
} from "lucide-react";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  client: { name: string; phone: string };
  service: { name: string; price: number; durationMin: number };
  professional: { id: string; name: string; userId?: string };
};

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
        <div className="bg-emerald-600 text-white py-4 px-6 rounded-3xl flex items-center gap-4 shadow-xl shadow-emerald-500/20 border border-emerald-400/30">
          <div className="bg-white/20 p-2 rounded-xl"><Megaphone className="h-6 w-6" /></div>
          <p className="font-bold text-sm uppercase tracking-wide">{data.announcement.content}</p>
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
        {[ { label: "Total do Dia", value: stats.total, color: "text-zinc-900 dark:text-white" }, { label: "Agendados", value: stats.confirmed, color: "text-emerald-600 dark:text-emerald-400" }, { label: "Finalizados", value: stats.completed, color: "text-blue-600 dark:text-blue-400" }, { label: "Cancelados", value: stats.canceled, color: "text-red-600 dark:text-red-500" } ].map(stat => (
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
            {timelineData.map((item: any) => item.isFree ? (
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
            ) : (
              // --- CARD DE AGENDAMENTO ---
              <div key={item.id} className="group flex flex-col lg:flex-row bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/40 dark:shadow-none overflow-hidden transition-all hover:border-emerald-500/50">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-6 flex lg:flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 lg:w-48 text-center">
                    <div>
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Horário</p>
                        <p className="text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter">{formatBR(item.startAt, "HH:mm")}</p>
                    </div>
                  {activeProfId === null && (
                    <div className="mt-0 lg:mt-4 flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                      <Scissors size={12} /> {item.professional.name.split(' ')[0]}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-6">
                  <h4 className="font-black text-2xl text-zinc-900 dark:text-white uppercase mb-3">{item.client.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {[ 
                        { Icon: Scissors, text: item.service.name, color: 'text-emerald-500' }, 
                        { Icon: Clock, text: `${item.service.durationMin || 0} min`, color: 'text-blue-500' }, 
                        { Icon: DollarSign, text: `R$ ${(item.service.price / 100).toFixed(2).replace('.', ',')}`, color: 'text-emerald-500' } 
                    ].map(badge => (
                        <span key={badge.text} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg">
                            <badge.Icon size={14} className={badge.color} /> {badge.text}
                        </span>
                    ))}
                  </div>
                  {item.client.phone && ( <a href={`https://wa.me/${item.client.phone.replace(/\D/g, '')}`} target="_blank" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 w-fit bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl"><MessageCircle size={16} /> WhatsApp</a> )}
                </div>

                <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/30 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800 flex flex-row lg:flex-col gap-3 justify-center">
                  <button disabled={updatingId === item.id} onClick={() => handleStatusChange(item.id, "COMPLETED")} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                    {updatingId === item.id ? <span className="animate-pulse">...</span> : <><CheckCircle2 size={18} /> Finalizar</>}
                  </button>
                  <button disabled={updatingId === item.id} onClick={() => { if(confirm("Deseja cancelar?")) handleStatusChange(item.id, "CANCELED"); }} className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-500 px-6 py-4 rounded-2xl text-xs font-black uppercase disabled:opacity-50">
                    <XCircle size={16} /> Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-16 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 shadow-sm transition-colors">
            <CalendarDays className="h-10 w-10 text-emerald-500 mb-6" />
            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Agenda Livre</h3>
            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Nenhum atendimento para hoje</p>
          </div>
        )}
      </section>
      
      {/* MODAL DE AGENDAMENTO MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <X size={24} />
                </button>

                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] mb-4 rotate-3">
                   <UserPlus className="h-6 w-6 text-zinc-950" />
                </div>
                
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white mb-1.5">
                    Novo <span className="text-emerald-500">Agendamento</span> Manual
                </h3>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-8">Marque um horário diretamente do balcão.</p>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cliente</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input type="text" value={manualForm.clientName} onChange={(e) => setManualForm({...manualForm, clientName: e.target.value})} className="w-full h-14 bg-zinc-100 dark:bg-zinc-950 rounded-2xl pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" placeholder="Nome do cliente" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">WhatsApp</label>
                            <div className="relative group">
                                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input type="tel" value={manualForm.clientPhone} onChange={(e) => setManualForm({...manualForm, clientPhone: e.target.value})} className="w-full h-14 bg-zinc-100 dark:bg-zinc-950 rounded-2xl pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Data do Agendamento</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                                <input type="date" value={manualForm.date} onChange={(e) => setManualForm({...manualForm, date: e.target.value})} className="w-full h-14 bg-zinc-100 dark:bg-zinc-950 rounded-2xl pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Horário</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                                <input type="time" value={manualForm.time} onChange={(e) => setManualForm({...manualForm, time: e.target.value})} className="w-full h-14 bg-zinc-100 dark:bg-zinc-950 rounded-2xl pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" required />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Barbeiro</label>
                            <select value={manualForm.professionalId} onChange={(e) => setManualForm({...manualForm, professionalId: e.target.value})} className="w-full h-14 bg-zinc-100 dark:bg-zinc-950 rounded-2xl px-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 appearance-none" required>
                                <option value="">Selecionar...</option>
                                {data?.professionals?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Serviço</label>
                            <select value={manualForm.serviceId} onChange={(e) => setManualForm({...manualForm, serviceId: e.target.value})} className="w-full h-14 bg-zinc-100 dark:bg-zinc-950 rounded-2xl px-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 appearance-none" required>
                                <option value="">Selecionar...</option>
                                {data?.services?.map(s => <option key={s.id} value={s.id}>{s.name} - R${(s.price/100).toFixed(2).replace('.', ',')}</option>)}
                            </select>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 mt-4">
                        {loading ? <span className="animate-pulse">Salvando...</span> : <>Confirmar no Sistema <ArrowRight size={16} /></>}
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}