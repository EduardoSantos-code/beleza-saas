"use client";

import { useEffect, useState } from "react";

type MetricSummary = {
  totalAppointments: number;
  completedAppointments: number;
  totalClients: number;
  totalRevenue: number;
};

type TopService = { name: string; count: number; revenue: number };
type TopProfessional = { name: string; count: number };

type MetricsData = {
  summary: MetricSummary;
  topServices: TopService[];
  topProfessionals: TopProfessional[];
};

export default function MetricsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/${slug}/metrics`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Erro ao carregar dados.");
        }

        setData(json);
      } catch (error: any) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando métricas...</p>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl bg-red-50 p-8 shadow-sm ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-900/50">
        <p className="text-red-600 dark:text-red-400">
          {errorMessage || "Não foi possível carregar o dashboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Relatórios
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            Métricas do Salão
          </h1>
        </div>
        <a
          href={`/admin/${slug}`}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
        >
          Voltar para Agenda
        </a>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Faturamento (Concluídos)"
          value={`R$ ${data.summary.totalRevenue.toFixed(2)}`}
          color="text-green-600 dark:text-green-400"
        />
        <Card
          title="Clientes Cadastrados"
          value={data.summary.totalClients.toString()}
        />
        <Card
          title="Agendamentos Totais"
          value={data.summary.totalAppointments.toString()}
        />
        <Card
          title="Serviços Concluídos"
          value={data.summary.completedAppointments.toString()}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Serviços */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-white">
            Serviços mais Realizados
          </h2>
          {data.topServices.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum serviço concluído ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {data.topServices.map((s, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {s.name}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {s.count} vezes (R$ {s.revenue.toFixed(2)})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-500 dark:bg-violet-600"
                      style={{
                        width: `${Math.min(
                          100,
                          (s.count / data.summary.completedAppointments) * 100 || 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Performance Profissionais */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-white">
            Ranking de Atendimentos
          </h2>
          {data.topProfessionals.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum atendimento registrado ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {data.topProfessionals.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {i + 1}
                    </div>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                    {p.count} atendimentos
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  color = "text-zinc-900 dark:text-white",
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}