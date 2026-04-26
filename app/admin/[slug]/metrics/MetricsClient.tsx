"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type MetricSummary = {
  totalAppointments: number;
  completedAppointments: number;
  totalClients: number;
  totalRevenue: number;
  totalComissoes: number;
  lucroLiquido: number;
};

type TopService = { name: string; count: number; revenue: number };

type ProfessionalDetail = {
  name: string;
  count: number;
  bruto: number;
  comissao: number;
};

type MetricsData = {
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    totalClients: number;
    totalRevenue: number;
    totalComissoes: number;
    lucroLiquido: number;
  };
  chartData: { date: string; faturamento: number }[];
  topServices: TopService[];
  detalheProfissionais: Record<string, ProfessionalDetail>;
};

export default function MetricsClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7"); // Estado para o filtro (7, 30, 1, etc)
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        // Agora passamos o ?range= para a API
        const res = await fetch(`/api/admin/${slug}/metrics?range=${range}`);
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
  }, [slug, range]); // Toda vez que o range mudar, ele busca dados novos

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl bg-red-50 p-8 shadow-sm ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-900/50">
        <p className="text-red-600 dark:text-red-400">
          {errorMessage || "Não foi possível carregar o dashboard."}
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return <p className="p-10 text-center text-zinc-500">Carregando métricas...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Relatórios</p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Métricas</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="w-full lg:w-auto rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm shadow-sm"
        >
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>

      {/* Grid de Cards - 2 colunas no mobile, 3 no desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <Card
          title="Faturamento"
          value={`R$ ${((data.summary.totalRevenue || 0) / 100).toFixed(2).replace('.', ',')}`}
          color="text-green-500"
          className="p-3 md:p-6" // Padding menor no mobile
        />
        <Card
          title="Comissões"
          value={`R$ ${((data.summary.totalComissoes || 0) / 100).toFixed(2).replace('.', ',')}`}
          color="text-orange-500"
          className="p-3 md:p-6"
        />
        <Card
          title="Lucro Líquido"
          value={`R$ ${((data.summary.lucroLiquido || 0) / 100).toFixed(2).replace('.', ',')}`}
          color="text-violet-500"
          className="p-3 md:p-6"
        />
        <Card
          title="Clientes"
          value={data.summary.totalClients.toString()}
          color="text-zinc-900 dark:text-white"
          className="p-3 md:p-6"
        />
      </div>

      {data.chartData && data.chartData.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-white">
            Faturamento do Período
          </h2>
          {/* Adicionamos min-w-0 para evitar que o gráfico "estoure" o grid e min-h para o Recharts não se perder */}
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  minTickGap={20}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar
                  dataKey="faturamento"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  // Isso dá um leve brilho quando passa o mouse, sem o quadrado branco
                  activeBar={{ fill: '#a78bfa' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Serviços */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-white">
            Serviços mais Realizados
          </h2>
          {(data?.topServices?.length || 0) === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum serviço concluído ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {data?.topServices?.map((s, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {s.name}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {s.count} vezes (R$ {(s.revenue / 100).toFixed(2)})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-500 dark:bg-violet-600"
                      style={{
                        width: `${Math.min(
                          100,
                          (s.count / (data?.summary?.completedAppointments || 1)) * 100 || 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Detalhamento Profissional (Substituindo o Ranking) */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-white">
            Performance por Barbeiro
          </h2>

          {/* Mobile: Lista de Cards */}
          <div className="block md:hidden space-y-3">
            {Object.values((data as any).detalheProfissionais || {}).map((prof: any, i) => (
              <div key={i} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-zinc-900 dark:text-white">{prof.name}</span>
                  <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-1 rounded-full">
                    {prof.count} cortes
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-zinc-500">Comissão: <span className="text-orange-500 font-medium">R${(prof.comissao / 100).toFixed(2)}</span></div>
                  <div className="text-zinc-500 text-right">Líquido: <span className="text-green-500 font-medium">R${((prof.bruto - prof.comissao) / 100).toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Tabela (escondida no mobile com hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="pb-4 font-semibold text-zinc-700 dark:text-zinc-300">Profissional</th>
                  <th className="pb-4 font-semibold text-zinc-700 dark:text-zinc-300 text-center">Cortes</th>
                  <th className="pb-4 font-semibold text-zinc-700 dark:text-zinc-300">Total Bruto</th>
                  <th className="pb-4 font-semibold text-orange-500">Comissão</th>
                  <th className="pb-4 font-semibold text-green-500 text-right">Líquido (Loja)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {/* Usamos o Record do objeto que criamos na API */}
                {Object.values((data as any).detalheProfissionais || {}).map((prof: any, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-4 font-medium text-zinc-900 dark:text-white">{prof.name}</td>
                    <td className="py-4 text-center text-zinc-600 dark:text-zinc-400">{prof.count}</td>
                    <td className="py-4 text-zinc-600 dark:text-zinc-400">
                      R$ {(prof.bruto / 100).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-4 font-medium text-orange-600 dark:text-orange-400">
                      R$ {(prof.comissao / 100).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-4 text-right font-bold text-green-600 dark:text-green-400">
                      R$ {((prof.bruto - prof.comissao) / 100).toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys((data as any).detalheProfissionais || {}).length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum dado detalhado para este período.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

interface CardProps {
  title: string;
  value: string | number;
  color?: string;
  className?: string;
}

function Card({ title, value, color, className }: CardProps) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 ${className}`}>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${color || 'text-zinc-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}