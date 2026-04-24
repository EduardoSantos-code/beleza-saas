"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBR } from "@/lib/date"; 

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  // CORREÇÃO 1: O nome aqui agora é apenas "phone" igual a API envia
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
          <h1 className="mt-1 text-3xl font-black text-white">{data?.tenant.name}</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-violet-500 [color-scheme:dark]"
        />
      </div>

      {/* ABAS DE PROFISSIONAIS */}
      {data?.professionals && data.professionals.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveProfId(null)}
            className={`shrink-0 rounded-full px-6 py-2 text-sm font-bold transition ${activeProfId === null ? "bg-violet-600 text-white" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
          >
            Geral
          </button>
          {data.professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setActiveProfId(prof.id)}
              className={`shrink-0 rounded-full px-6 py-2 text-sm font-bold transition ${activeProfId === prof.id ? "bg-violet-600 text-white" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                }`}
            >
              {prof.name}
            </button>
          ))}
        </div>
      )}

      {/* GRID DE MÉTRICAS */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs text-zinc-500 font-bold uppercase">Total</p>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs text-zinc-500 font-bold uppercase">Confirmados</p>
          <p className="text-2xl font-black text-green-500">{stats.confirmed}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs text-zinc-500 font-bold uppercase">Finalizados</p>
          <p className="text-2xl font-black text-blue-500">{stats.completed}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
          <p className="text-xs text-zinc-500 font-bold uppercase">Cancelados</p>
          <p className="text-2xl font-black text-red-500">{stats.canceled}</p>
        </div>
      </div>

      {/* LISTA DE AGENDAMENTOS */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-800 p-4">
          <h2 className="font-bold text-white">
            {activeProfId ? `Agenda: ${data?.professionals.find(p => p.id === activeProfId)?.name}` : "Próximos Atendimentos"}
          </h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {visibleAppointments.length > 0 ? (
            visibleAppointments.map((app) => (
              <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition hover:bg-zinc-800/50">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-bold text-violet-500 uppercase tracking-tight bg-violet-500/10 px-2 py-1 rounded-md">
                      {formatBR(app.startAt, "HH:mm")}
                    </p>
                    <p className="font-bold text-white text-lg leading-tight">{app.client.name}</p>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <p className="text-zinc-300 font-medium">
                      {app.service.name}
                    </p>
                    <span className="hidden sm:inline text-zinc-700">•</span>
                    <p>
                      ⏱ {app.service.duration} min
                    </p>
                    <span className="hidden sm:inline text-zinc-700">•</span>
                    <p>
                      💰 R$ {(app.service.price / 100).toFixed(2).replace('.', ',')}
                    </p>
                    {activeProfId === null && (
                      <>
                        <span className="hidden sm:inline text-zinc-700">•</span>
                        <p className="text-zinc-500">
                          ✂️ {app.professional.name}
                        </p>
                      </>
                    )}
                  </div>

                  {/* CORREÇÃO 2: Lê o app.client.phone e limpa os caracteres especiais pro Zap não bugar */}
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

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-md border ${
                      app.status === "CONFIRMED" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}>
                    {app.status === "CONFIRMED" ? "CONFIRMADO" : "PENDENTE"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">🎉</span>
              <p className="text-center text-zinc-500 font-medium">Todos os atendimentos concluídos ou lista vazia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}