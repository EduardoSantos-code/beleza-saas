"use client";

import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  client: { name: string; phoneE164: string };
  service: { name: string; priceCents: number; durationMin: number };
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
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  async function loadAppointments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/appointments?date=${date}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar");
      setData(json);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); }, [slug, date]);

  const filteredAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    if (!activeProfId) return data.appointments;
    return data.appointments.filter(a => a.professional.id === activeProfId);
  }, [data, activeProfId]);

  // Lógica atualizada para incluir cancelados e pendentes
  const stats = useMemo(() => {
    const apps = filteredAppointments;
    return {
      total: apps.length,
      confirmed: apps.filter((a) => a.status === "CONFIRMED").length,
      completed: apps.filter((a) => a.status === "COMPLETED").length,
      canceled: apps.filter((a) => a.status === "CANCELED").length,
    };
  }, [filteredAppointments]);

  if (loading) return <div className="p-10 text-white">Carregando agenda...</div>;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-violet-500">Painel Interno</p>
          <h1 className="mt-1 text-3xl font-black text-white">{data?.tenant.name}</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-violet-500"
        />
      </div>

      {/* ABAS DE PROFISSIONAIS */}
      {data?.professionals && data.professionals.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveProfId(null)}
            className={`shrink-0 rounded-full px-6 py-2 text-sm font-bold transition ${activeProfId === null
                ? "bg-violet-600 text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
              }`}
          >
            Geral
          </button>

          {data.professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setActiveProfId(prof.id)}
              className={`shrink-0 rounded-full px-6 py-2 text-sm font-bold transition ${activeProfId === prof.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
                }`}
            >
              {prof.name}
            </button>
          ))}
        </div>
      )}

      {/* GRID DE MÉTRICAS - Ajustado para 2x2 no mobile e 4 colunas no desktop */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs md:text-sm text-zinc-500 font-bold uppercase">Total</p>
          <p className="text-2xl md:text-3xl font-black text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs md:text-sm text-zinc-500 font-bold uppercase">Confirmados</p>
          <p className="text-2xl md:text-3xl font-black text-green-500">{stats.confirmed}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs md:text-sm text-zinc-500 font-bold uppercase">Finalizados</p>
          <p className="text-2xl md:text-3xl font-black text-blue-500">{stats.completed}</p>
        </div>
        {/* CARD DE CANCELADOS */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs md:text-sm text-zinc-500 font-bold uppercase">Cancelados</p>
          <p className="text-2xl md:text-3xl font-black text-red-500">{stats.canceled}</p>
        </div>
      </div>

      {/* LISTA DE AGENDAMENTOS */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-800 p-4">
          <h2 className="font-bold text-white">
            {activeProfId ? `Agenda: ${data?.professionals.find(p => p.id === activeProfId)?.name}` : "Todos os Agendamentos"}
          </h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-tight">
                    {new Date(app.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="font-bold text-white text-sm md:text-base leading-tight">{app.client.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{app.service.name} • {app.professional.name}</p>
                </div>

                <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-md border ${app.status === "CONFIRMED" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  app.status === "CANCELED" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    app.status === "COMPLETED" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                  {app.status === "CONFIRMED" ? "CONFIRMADO" :
                    app.status === "CANCELED" ? "CANCELADO" :
                      app.status === "COMPLETED" ? "FINALIZADO" : "PENDENTE"}
                </span>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-zinc-600 text-sm">Nenhum agendamento encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}