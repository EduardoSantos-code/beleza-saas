"use client";

import { useEffect, useMemo, useState } from "react";
import OnboardingFlow from "./OnboardingFlow";

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
  professionals: Professional[]; // Adicionamos a lista de profissionais aqui
  hasServices: boolean;
  hasProfessionals: boolean;
};

// ... (as funções statusLabel e statusClasses continuam as mesmas)

export default function AdminAppointmentsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // ESTADO DA ABA ATIVA (null = Geral/Todos)
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
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAppointments(); }, [slug, date]);

  // FILTRAGEM DINÂMICA
  const filteredAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    if (!activeProfId) return data.appointments;
    return data.appointments.filter(a => a.professional.id === activeProfId);
  }, [data, activeProfId]);

  const stats = useMemo(() => {
    const apps = filteredAppointments;
    return {
      total: apps.length,
      confirmed: apps.filter((a) => a.status === "CONFIRMED").length,
      canceled: apps.filter((a) => a.status === "CANCELED").length,
      completed: apps.filter((a) => a.status === "COMPLETED").length,
    };
  }, [filteredAppointments]);

  // ... (função updateStatus continua a mesma)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Cabeçalho e Data */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">Painel interno</p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{data?.tenant.name || "Agenda"}</h1>
        </div>

        <div className="w-full sm:max-w-[200px]">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full appearance-none text-left min-h-[50px] [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-start rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white [color-scheme:light_dark]"
          />
        </div>
      </div>

      {/* ABAS DE PROFISSIONAIS (TABS) */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveProfId(null)}
          className={`shrink-0 rounded-full px-6 py-2 text-sm font-bold transition ${
            activeProfId === null 
              ? "bg-violet-600 text-white" 
              : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800"
          }`}
        >
          Geral
        </button>
        {data?.professionals?.map((prof) => (
          <button
            key={prof.id}
            onClick={() => setActiveProfId(prof.id)}
            className={`shrink-0 rounded-full px-6 py-2 text-sm font-bold transition ${
              activeProfId === prof.id 
                ? "bg-violet-600 text-white" 
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800"
            }`}
          >
            {prof.name}
          </button>
        ))}
      </div>

      {/* Cards de Métricas (Agora refletem a aba selecionada) */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* ... (mesmo código dos cards de stats que já tínhamos) */}
      </div>

      {/* Listagem de Agendamentos (Filtrada) */}
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {activeProfId ? `Agenda de ${data?.professionals?.find(p => p.id === activeProfId)?.name}` : "Agendamentos Gerais"}
          </h2>
        </div>
        
        {/* ... (restante da listagem de agendamentos) */}
      </section>
    </div>
  );
}