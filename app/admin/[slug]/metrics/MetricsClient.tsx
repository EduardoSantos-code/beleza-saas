"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  PieChart,
  UserCheck,
  ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";

type TopService = {
  name: string;
  count: number;
  revenue: number;
};

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
    totalClubDiscountInCents?: number;
  };
  chartData: { date: string; faturamento: number }[];
  topServices: TopService[];
  detalheProfissionais: Record<string, ProfessionalDetail>;
};

function formatCurrencyFromCents(valueInCents: number | null | undefined) {
  const value = typeof valueInCents === "number" ? valueInCents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function formatCurrencyFromReais(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function MetricsClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/${slug}/metrics?range=${range}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao carregar dados.");
        setData(json);
      } catch (error: any) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [slug, range]);

  if (loading || !data) return (
    <div className="p-10 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-bold">
      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
      Gerando relatórios...
    </div>
  );

  const chartDataInReais = data.chartData.map((item) => ({
    ...item,
    faturamentoReais: item.faturamento / 100,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 pb-20">

      {/* HEADER E FILTRO */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:text-emerald-500 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Desempenho da Unidade
            </p>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white italic">Dashboard</h1>
          </div>
        </div>

        <div className="relative inline-block w-full md:w-64">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-full appearance-none rounded-2xl px-5 py-4 text-sm font-black shadow-xl ring-1 ring-zinc-200 outline-none transition-all bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white focus:ring-2 ring-emerald-500"
          >
            <option value="1">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard
          title="Faturamento Bruto"
          value={formatCurrencyFromCents(data.summary.totalRevenue)}
          icon={DollarSign}
          color="text-emerald-500"
          trend="Total recebido"
        />
        <MetricCard
          title="Lucro Líquido"
          value={formatCurrencyFromCents(data.summary.lucroLiquido)}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-400"
          trend="Após comissões"
        />
        <MetricCard
          title="Comissões"
          value={formatCurrencyFromCents(data.summary.totalComissoes)}
          icon={PieChart}
          color="text-amber-500"
          trend="Valor para equipe"
        />
        <MetricCard
          title="Clientes Atendidos"
          value={data.summary.totalClients}
          icon={Users}
          color="text-blue-500"
          trend="Base do período"
        />
      </div>

      {data.summary.totalClubDiscountInCents && data.summary.totalClubDiscountInCents > 0 ? (
        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-500">Descontos do Clube</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Total concedido no período</p>
          </div>
          <p className="text-lg font-black text-zinc-900 dark:text-white">{formatCurrencyFromCents(data.summary.totalClubDiscountInCents)}</p>
        </div>
      ) : null}

      {/* GRÁFICO PRINCIPAL */}
      <section className="rounded-3xl bg-white p-8 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-black uppercase text-zinc-800 dark:text-zinc-200 tracking-widest">
            Faturamento do Período
          </h2>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataInReais} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 11, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(val) => `R$${val / 100}`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: 'bold'
                }}
                formatter={(value: any) => [
                  formatCurrencyFromReais(Number(value ?? 0)),
                  "Faturamento",
                ]}
              />
              {/* AQUI ESTÁ O TRUQUE: Usamos o 'as any' no Bar para silenciar o erro de tipagem chato */}
              <Bar dataKey="faturamentoReais" radius={[6, 6, 0, 0]} {...({} as any)}>
                {chartDataInReais.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* TOP SERVIÇOS */}
        <section className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-8 text-sm font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Serviços Populares
          </h2>
          <div className="space-y-6">
            {data?.topServices?.map((s, i) => (
              <div key={i}>
                <div className="mb-2 flex justify-between">
                  <span className="font-black text-zinc-900 dark:text-white uppercase text-xs">{s.name}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{formatCurrencyFromCents(s.revenue)}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (s.count / (data?.summary?.completedAppointments || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PERFORMANCE POR BARBEIRO */}
        <section className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="mb-8 text-sm font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Performance da Equipe
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="pb-4 text-[10px] font-black uppercase text-zinc-400">Nome</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-zinc-400 text-center">Atend.</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-emerald-600 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {Object.values(data.detalheProfissionais || {}).map((prof, i) => (
                  <tr key={i} className="group">
                    <td className="py-4 font-black text-zinc-900 dark:text-white uppercase text-xs">{prof.name}</td>
                    <td className="py-4 text-center text-zinc-600 dark:text-zinc-400 font-bold">{prof.count}</td>
                    <td className="py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyFromCents(prof.bruto - prof.comissao)}
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

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend: string;
}

function MetricCard({ title, value, icon: Icon, color, trend }: MetricCardProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
      <div className={`p-2 w-fit rounded-xl bg-zinc-50 dark:bg-zinc-800 mb-4 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">{title}</p>
      <p className={`mt-1 text-2xl font-black italic tracking-tighter ${color || 'text-zinc-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="mt-2 text-[10px] font-bold text-zinc-400">{trend}</p>
    </div>
  );
}