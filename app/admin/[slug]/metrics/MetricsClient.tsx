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
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white p-8 text-zinc-500 shadow-sm ring-1 ring-zinc-200">
            Carregando métricas...
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !data) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-red-50 p-8 text-red-600 shadow-sm ring-1 ring-red-200">
            {errorMessage || "Não foi possível carregar o dashboard."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-violet-600">Relatórios</p>
            <h1 className="text-3xl font-bold text-zinc-900">Métricas do Salão</h1>
          </div>
          <a href={`/admin/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
            Voltar para Agenda
          </a>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Faturamento (Concluídos)" value={`R$ ${data.summary.totalRevenue.toFixed(2)}`} color="text-green-600" />
          <Card title="Clientes Cadastrados" value={data.summary.totalClients.toString()} />
          <Card title="Agendamentos Totais" value={data.summary.totalAppointments.toString()} />
          <Card title="Serviços Concluídos" value={data.summary.completedAppointments.toString()} />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Top Serviços */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <h2 className="mb-6 text-lg font-bold text-zinc-900">Serviços mais Realizados</h2>
            {data.topServices.length === 0 ? (
               <p className="text-sm text-zinc-500">Nenhum serviço concluído ainda.</p>
            ) : (
              <div className="space-y-4">
                {data.topServices.map((s, i) => (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-zinc-700">{s.name}</span>
                      <span className="text-zinc-500">{s.count} vezes (R$ {s.revenue.toFixed(2)})</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100">
                      <div 
                        className="h-full rounded-full bg-violet-500" 
                        style={{ width: `${Math.min(100, (s.count / data.summary.completedAppointments) * 100 || 0)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Performance Profissionais */}
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <h2 className="mb-6 text-lg font-bold text-zinc-900">Ranking de Atendimentos</h2>
            {data.topProfessionals.length === 0 ? (
               <p className="text-sm text-zinc-500">Nenhum atendimento registrado ainda.</p>
            ) : (
              <div className="space-y-6">
                {data.topProfessionals.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">{i + 1}</div>
                      <span className="font-medium text-zinc-800">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-violet-600">{p.count} atendimentos</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({ title, value, color = "text-zinc-900" }: { title: string, value: string, color?: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}