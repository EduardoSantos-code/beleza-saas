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
  professional: { name: string };
};

type ResponseData = {
  tenant: { id: string; name: string };
  appointments: Appointment[];
  hasServices: boolean;
  hasProfessionals: boolean;
};

function statusLabel(status: Appointment["status"]) {
  switch (status) {
    case "PENDING": return "Pendente";
    case "CONFIRMED": return "Confirmado";
    case "CANCELED": return "Cancelado";
    case "COMPLETED": return "Concluído";
    default: return status;
  }
}

function statusClasses(status: Appointment["status"]) {
  switch (status) {
    case "PENDING": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900";
    case "CONFIRMED": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900";
    case "CANCELED": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900";
    case "COMPLETED": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900";
    default: return "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
}

export default function AdminAppointmentsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  async function updateStatus(id: string, status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED") {
    try {
      setUpdatingId(id);
      const res = await fetch(`/api/admin/${slug}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      await loadAppointments();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = useMemo(() => {
    const apps = data?.appointments || [];
    return {
      total: apps.length,
      confirmed: apps.filter((a) => a.status === "CONFIRMED").length,
      canceled: apps.filter((a) => a.status === "CANCELED").length,
      completed: apps.filter((a) => a.status === "COMPLETED").length,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl">
      {data && (!data.hasServices || !data.hasProfessionals) && (
        <OnboardingFlow slug={slug} hasServices={data.hasServices} hasProfessionals={data.hasProfessionals} onComplete={loadAppointments} />
      )}

      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">Painel interno</p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{data?.tenant.name || "Agenda"}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">Gerencie os agendamentos do dia.</p>
        </div>

        <div className="w-full sm:max-w-[200px]">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white [color-scheme:light_dark]"
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Confirmados</p>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.confirmed}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cancelados</p>
          <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">{stats.canceled}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Concluídos</p>
          <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">{stats.completed}</p>
        </div>
      </div>

      {errorMessage && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{errorMessage}</div>}

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Agendamentos</h2>
        </div>

        {loading ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">Carregando...</div>
        ) : !data?.appointments.length ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">Nenhum agendamento nesta data.</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.appointments.map((appointment) => {
              const isLocked = appointment.status === "CANCELED" || appointment.status === "COMPLETED";

              return (
                <div key={appointment.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid flex-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Horário</p>
                      <p className="mt-1 font-medium text-zinc-900 dark:text-white">
                        {new Date(appointment.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {new Date(appointment.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cliente</p>
                      <p className="mt-1 font-medium text-zinc-900 dark:text-white">{appointment.client.name}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{appointment.client.phoneE164}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Serviço</p>
                      <p className="mt-1 font-medium text-zinc-900 dark:text-white">{appointment.service.name}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{appointment.service.durationMin} min • R$ {(appointment.service.priceCents / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Profissional</p>
                      <p className="mt-1 font-medium text-zinc-900 dark:text-white">{appointment.professional.name}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                    {!isLocked && (
                      <div className="flex flex-wrap gap-2">
                        {appointment.status !== "CONFIRMED" && (
                          <button onClick={() => updateStatus(appointment.id, "CONFIRMED")} disabled={updatingId === appointment.id} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Confirmar</button>
                        )}
                        <button onClick={() => updateStatus(appointment.id, "COMPLETED")} disabled={updatingId === appointment.id} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">Concluir</button>
                        <button onClick={() => updateStatus(appointment.id, "CANCELED")} disabled={updatingId === appointment.id} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Cancelar</button>
                      </div>
                    )}
                    {appointment.notes && (
                      <div className="max-w-xs rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300"><span className="font-medium text-zinc-700 dark:text-zinc-200">Obs:</span> {appointment.notes}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}