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
  ChevronDown
} from "lucide-react";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  client: { name: string; phone: string };
  service: { name: string; price: number; duration: number };
  professional: { id: string; name: string };
};

type Professional = { id: string; name: string };

type ResponseData = {
  tenant: { id: string; name: string };
  appointments: Appointment[];
  professionals: Professional[];
};

export default function AdminAppointmentsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfId, setActiveProfId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [date, setDate] = useState(() => {
    return formatBR(new Date(), "yyyy-MM-dd");
  });

  async function loadAppointments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/appointments?date=${date}`, {
        cache: 'no-store'
      });
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
    } catch (err) {
      alert("Erro ao atualizar o agendamento.");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => { loadAppointments(); }, [slug, date]);

  const professionalAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    if (!activeProfId) return data.appointments;
    return data.appointments.filter(a => a.professional.id === activeProfId);
  }, [data, activeProfId]);

  const stats = useMemo(() => {
    const apps = professionalAppointments;
    return {
      total: apps.length,
      confirmed: apps.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING").length, // Agendados pro dia
      completed: apps.filter((a) => a.status === "COMPLETED").length,
      canceled: apps.filter((a) => a.status === "CANCELED").length,
    };
  }, [professionalAppointments]);

  const visibleAppointments = useMemo(() => {
    return professionalAppointments.filter(
      (a) => a.status !== "CANCELED" && a.status !== "COMPLETED"
    );
  }, [professionalAppointments]);

  if (loading) return (
    <div className="p-10 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-bold italic">
      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
      Sincronizando Agenda...
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-20">
      
      {/* HEADER & DATE PICKER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-xs">
            <CalendarDays className="h-4 w-4" />
            Painel Interno
          </div>
          <h2 className="mt-2 text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter">
            {data?.tenant.name || "Sua Barbearia"}
          </h2>
        </div>
        
        <div className="relative group w-full lg:w-auto">
          <input
            type="date"
            value={date}
            onClick={(e) => e.currentTarget.showPicker()}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <button className="w-full flex justify-between lg:justify-start items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all bg-white border border-zinc-200 text-zinc-900 group-hover:border-emerald-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:group-hover:border-emerald-500 shadow-xl shadow-zinc-200/50 dark:shadow-none uppercase tracking-widest text-sm"> 
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-emerald-500" /> 
              <span>{date.split('-').reverse().join('/')}</span>
            </div>
            <ChevronDown size={16} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* ABAS DE PROFISSIONAIS (TOGGLE PREMIUM) */}
      {data?.professionals && data.professionals.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={() => setActiveProfId(null)}
            className={`shrink-0 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
              activeProfId === null
                ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950 shadow-lg"
                : "bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:dark:border-zinc-700"
            }`}
          >
            Todos
          </button>
          {data.professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setActiveProfId(prof.id)}
              className={`shrink-0 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
                activeProfId === prof.id
                  ? "bg-zinc-900 text-white dark:bg-emerald-500 dark:text-zinc-950 shadow-lg"
                  : "bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:dark:border-zinc-700"
              }`}
            >
              <User size={14} /> {prof.name}
            </button>
          ))}
        </div>
      )}

      {/* GRID DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl p-6 bg-white border border-zinc-200 shadow-xl shadow-zinc-200/30 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total do Dia</p>
          <p className="mt-1 text-3xl font-black text-zinc-900 dark:text-white italic">{stats.total}</p>
        </div>
        <div className="rounded-3xl p-6 bg-white border border-zinc-200 shadow-xl shadow-zinc-200/30 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Agendados</p>
          <p className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400 italic">{stats.confirmed}</p>
        </div>
        <div className="rounded-3xl p-6 bg-white border border-zinc-200 shadow-xl shadow-zinc-200/30 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500">Finalizados</p>
          <p className="mt-1 text-3xl font-black text-blue-600 dark:text-blue-400 italic">{stats.completed}</p>
        </div>
        <div className="rounded-3xl p-6 bg-white border border-zinc-200 shadow-xl shadow-zinc-200/30 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500">Cancelados</p>
          <p className="mt-1 text-3xl font-black text-red-600 dark:text-red-500 italic">{stats.canceled}</p>
        </div>
      </div>

      {/* LISTA DE AGENDAMENTOS (TIMELINE / TICKETS) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            {activeProfId ? `Próximos de ${data?.professionals.find(p => p.id === activeProfId)?.name}` : "Próximos Atendimentos"}
          </h3>
          <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1 rounded-full">
            {visibleAppointments.length} na fila
          </span>
        </div>

        {visibleAppointments.length > 0 ? (
          <div className="grid gap-4">
            {visibleAppointments.map((app) => (
              <div 
                key={app.id} 
                className="group flex flex-col lg:flex-row bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/40 dark:shadow-none overflow-hidden transition-all hover:border-emerald-500/50"
              >
                {/* BLOCO DE TEMPO (Destaque máximo) */}
                <div className="bg-zinc-50 dark:bg-zinc-950 p-6 flex lg:flex-col items-center justify-between lg:justify-center border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 lg:w-48">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">Horário</p>
                    <p className="text-4xl font-black text-zinc-900 dark:text-white italic tracking-tighter">
                      {formatBR(app.startAt, "HH:mm")}
                    </p>
                  </div>
                  {activeProfId === null && (
                    <div className="mt-0 lg:mt-4 flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                      <Scissors size={12} /> {app.professional.name.split(' ')[0]}
                    </div>
                  )}
                </div>
                
                {/* DADOS DO CLIENTE & SERVIÇO */}
                <div className="flex-1 p-6 flex flex-col justify-center">
                  <h4 className="font-black text-2xl text-zinc-900 dark:text-white uppercase tracking-tight mb-3">
                    {app.client.name}
                  </h4>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg">
                      <Scissors size={14} className="text-emerald-500" /> {app.service.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg">
                      <Clock size={14} className="text-blue-500" /> {app.service.duration} min
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg">
                      <DollarSign size={14} className="text-emerald-500" /> R$ {(app.service.price / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {app.client.phone && (
                    <a 
                      href={`https://wa.me/${app.client.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors w-fit bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl"
                    >
                      <MessageCircle size={16} /> 
                      Chamar no WhatsApp ({app.client.phone})
                    </a>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO LATERAIS */}
                <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/30 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800 flex flex-row lg:flex-col gap-3 justify-center">
                  <button
                    disabled={updatingId === app.id}
                    onClick={() => handleStatusChange(app.id, "COMPLETED")}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {updatingId === app.id ? (
                       <span className="animate-pulse">...</span>
                    ) : (
                       <><CheckCircle2 size={18} /> Finalizar</>
                    )}
                  </button>
                  
                  <button
                    disabled={updatingId === app.id}
                    onClick={() => {
                      if(confirm("Deseja realmente cancelar este horário?")) {
                        handleStatusChange(app.id, "CANCELED");
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-500 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <XCircle size={16} /> Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-16 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/50">
            <div className="h-20 w-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
              <CalendarDays className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Agenda Livre</h3>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-center max-w-sm">
              Nenhum cliente aguardando na fila para esta data ou filtro selecionado.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}