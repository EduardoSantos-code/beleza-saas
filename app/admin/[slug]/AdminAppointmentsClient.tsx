"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBR } from "@/lib/date"; 
import { Calendar } from "lucide-react";

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
  const [updatingId, setUpdatingId] = useState<string | null>(null); // Estado para o loading do botão

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

  // NOVA FUNÇÃO: Mudar Status (Finalizar/Cancelar)
  async function handleStatusChange(id: string, newStatus: string) {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/admin/${slug}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar");
      
      // Recarrega a lista para o item sumir e as métricas atualizarem
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
      confirmed: apps.filter((a) => a.status === "CONFIRMED").length,
      completed: apps.filter((a) => a.status === "COMPLETED").length,
      canceled: apps.filter((a) => a.status === "CANCELED").length,
    };
  }, [professionalAppointments]);

  // Filtra para exibir apenas o que o barbeiro precisa ver agora
  const visibleAppointments = useMemo(() => {
    return professionalAppointments.filter(
      (a) => a.status !== "CANCELED" && a.status !== "COMPLETED"
    );
  }, [professionalAppointments]);

  if (loading) return <div className="p-10 text-white">Carregando agenda...</div>;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-violet-500">Painel Interno</p>
          <h2 className="text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tighter">
            {data?.tenant.name}
          </h2>
        </div>
        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <button className="flex items-center gap-3 px-5 py-2.5 rounded-xl font-bold transition-all border   /* Modo Claro */   bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50   /* Modo Escuro */   dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-800" >   <span>{date.split('-').reverse().join('/')}</span>   <Calendar size={18} className="text-violet-600" /> </button>
        </div>
      </div>

      {/* ABAS DE PROFISSIONAIS */}
      {data?.professionals && data.professionals.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveProfId(null)}
            className={`shrink-0 px-6 py-2 rounded-full font-bold transition-all ${
              activeProfId === null
                ? "bg-violet-600 text-white"
                : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            Geral
          </button>
          {data.professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setActiveProfId(prof.id)}
              className={`shrink-0 px-6 py-2 rounded-full font-bold transition-all ${
                activeProfId === prof.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {prof.name}
            </button>
          ))}
        </div>
      )}

      {/* GRID DE MÉTRICAS */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl p-6 transition-all border bg-white border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Total</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl p-6 transition-all border bg-white border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Confirmados</p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">{stats.confirmed}</p>
        </div>
        <div className="rounded-2xl p-6 transition-all border bg-white border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Finalizados</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-500">{stats.completed}</p>
        </div>
        <div className="rounded-2xl p-6 transition-all border bg-white border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Cancelados</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-500">{stats.canceled}</p>
        </div>
      </div>

      {/* LISTA DE AGENDAMENTOS */}
      <div className="mt-8 overflow-hidden rounded-3xl border    /* Modo Claro */   bg-white border-zinc-200    /* Modo Escuro */   dark:bg-zinc-900 dark:border-zinc-800">
        <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            {activeProfId ? `Agenda: ${data?.professionals.find(p => p.id === activeProfId)?.name}` : "Próximos Atendimentos"}
          </h3>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleAppointments.length > 0 ? (
            visibleAppointments.map((app) => (
              <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-bold text-violet-500 uppercase tracking-tight bg-violet-500/10 px-2 py-1 rounded-md">
                      {formatBR(app.startAt, "HH:mm")}
                    </p>
                    <p className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{app.client.name}</p>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <p className="text-zinc-600 dark:text-zinc-300 font-medium">{app.service.name}</p>
                    <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>
                    <p>⏱ {app.service.duration} min</p>
                    <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>
                    <p>💰 R$ {(app.service.price / 100).toFixed(2).replace('.', ',')}</p>
                    {activeProfId === null && (
                      <>
                        <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>
                        <p className="text-zinc-500">✂️ {app.professional.name}</p>
                      </>
                    )}
                  </div>

                  {app.client.phone && (
                    <a 
                      href={`https://wa.me/${app.client.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs text-green-500 hover:text-green-400 hover:underline"
                    >
                      💬 {app.client.phone}
                    </a>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={updatingId === app.id}
                    onClick={() => handleStatusChange(app.id, "COMPLETED")}
                    className="flex-1 md:flex-none bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {updatingId === app.id ? "..." : "Finalizar"}
                  </button>
                  
                  <button
                    disabled={updatingId === app.id}
                    onClick={() => {
                      if(confirm("Deseja realmente cancelar este horário?")) {
                        handleStatusChange(app.id, "CANCELED");
                      }
                    }}
                    className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {updatingId === app.id ? "..." : "Cancelar"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center min-h-[350px]">
              <span className="text-4xl mb-4">🎉</span>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-center max-w-[250px]">
                Todos os atendimentos concluídos ou lista vazia.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}