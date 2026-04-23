"use client";


import OnboardingFlow from "./OnboardingFlow"; // NOVO IMPORT
import { useEffect, useMemo, useState } from "react";
import LogoutButton from "./LogoutButton";


type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  notes?: string | null;
  client: {
    name: string;
    phoneE164: string;
  };
  service: {
    name: string;
    priceCents: number;
    durationMin: number;
  };
  professional: {
    name: string;
  };
};

type ResponseData = {
  tenant: {
    id: string;
    name: string;
  };
  appointments: Appointment[];
  hasServices: boolean;      // NOVO CAMPO
  hasProfessionals: boolean; // NOVO CAMPO
};

function statusLabel(status: Appointment["status"]) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "CONFIRMED":
      return "Confirmado";
    case "CANCELED":
      return "Cancelado";
    case "COMPLETED":
      return "Concluído";
    default:
      return status;
  }
}

function statusClasses(status: Appointment["status"]) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "CANCELED":
      return "bg-red-100 text-red-800 border-red-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
}

export default function AdminAppointmentsClient({ slug }: { slug: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  async function loadAppointments() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/appointments?date=${date}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Resposta inválida da API: ${text}`);
      }

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar agendamentos");
      }

      setData(json);
    } catch (err: any) {
      console.error("Erro ao carregar agendamentos:", err);
      setErrorMessage(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, [slug, date]);

  async function updateStatus(
    id: string,
    status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED"
  ) {
    try {
      setUpdatingId(id);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Resposta inválida da API: ${text}`);
      }

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao atualizar status");
      }

      await loadAppointments();
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      setErrorMessage(err.message || "Erro ao atualizar");
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = useMemo(() => {
    const appointments = data?.appointments || [];
    return {
      total: appointments.length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      canceled: appointments.filter((a) => a.status === "CANCELED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      {/* NOVO BLOCO DE ONBOARDING */}
      {data && (!data.hasServices || !data.hasProfessionals) && (
        <OnboardingFlow
          slug={slug}
          hasServices={data.hasServices}
          hasProfessionals={data.hasProfessionals}
          onComplete={() => loadAppointments()} // Recarrega os dados para sumir o onboarding
        />
      )}
      {/* FIM DO NOVO BLOCO */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          
          <div className="flex w-full items-start justify-between lg:w-auto">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-violet-600">
                Painel interno
              </p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-900">
                {data?.tenant.name || "Agenda"}
              </h1>
              <p className="mt-2 text-zinc-600">
                Gerencie os agendamentos do dia.
              </p>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-xl border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-auto lg:items-end">
            <div className="w-full sm:max-w-[200px]">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500"
              />
            </div>

            <div
              className={`${
                isMenuOpen ? "flex" : "hidden"
              } w-full items-center gap-2 overflow-x-auto pb-2 lg:flex lg:w-auto lg:flex-wrap lg:overflow-visible`}
            >
              <a href={`/admin/${slug}/billing`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Assinatura</a>
              <a href={`/admin/${slug}/metrics`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Métricas</a>
              <a href={`/admin/${slug}/services`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Serviços</a>
              <a href={`/admin/${slug}/professionals`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Profissionais</a>
              <a href={`/admin/${slug}/hours`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Horários</a>
              <a href={`/admin/${slug}/blocks`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Bloqueios</a>
              <a href={`/admin/${slug}/whatsapp`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">WhatsApp</a>
              <a href={`/admin/${slug}/inbox`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Inbox</a>
              <a href={`/admin/${slug}/branding`} className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Branding</a>
              <div className="shrink-0">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-500">Total</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-500">Confirmados</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{stats.confirmed}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-500">Cancelados</p>
            <p className="mt-2 text-2xl font-bold text-red-700">{stats.canceled}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-500">Concluídos</p>
            <p className="mt-2 text-2xl font-bold text-green-700">{stats.completed}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">Agendamentos</h2>
          </div>

          {loading ? (
            <div className="p-6 text-zinc-600">Carregando...</div>
          ) : !data?.appointments.length ? (
            <div className="p-6 text-zinc-600">
              Nenhum agendamento nesta data.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {data.appointments.map((appointment) => {
                
                // NOVA REGRA AQUI: Verifica se o agendamento está travado
                const isLocked = appointment.status === "CANCELED" || appointment.status === "COMPLETED";

                return (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="grid flex-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Horário</p>
                        <p className="mt-1 font-medium text-zinc-900">
                          {new Date(appointment.startAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(appointment.endAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Cliente</p>
                        <p className="mt-1 font-medium text-zinc-900">{appointment.client.name}</p>
                        <p className="text-sm text-zinc-500">{appointment.client.phoneE164}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Serviço</p>
                        <p className="mt-1 font-medium text-zinc-900">{appointment.service.name}</p>
                        <p className="text-sm text-zinc-500">
                          {appointment.service.durationMin} min • R${" "}
                          {(appointment.service.priceCents / 100).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Profissional</p>
                        <p className="mt-1 font-medium text-zinc-900">{appointment.professional.name}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                          appointment.status
                        )}`}
                      >
                        {statusLabel(appointment.status)}
                      </span>

                      {/* Se NÃO estiver travado, mostra os botões */}
                      {!isLocked && (
                        <div className="flex flex-wrap gap-2">
                          {appointment.status !== "CONFIRMED" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(appointment.id, "CONFIRMED")}
                              disabled={updatingId === appointment.id}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => updateStatus(appointment.id, "COMPLETED")}
                            disabled={updatingId === appointment.id}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Concluir
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStatus(appointment.id, "CANCELED")}
                            disabled={updatingId === appointment.id}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {appointment.notes && (
                        <div className="max-w-xs rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                          <span className="font-medium text-zinc-700">Obs:</span>{" "}
                          {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}