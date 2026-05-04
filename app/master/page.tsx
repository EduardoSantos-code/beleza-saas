import { prisma } from "@/lib/prisma";
import { Users, CalendarCheck, TrendingUp, AlertTriangle } from "lucide-react";

// Função para procurar as métricas no Prisma
async function getMasterMetrics() {
  const [totalTenants, activeTenants, trialingTenants, totalAppointments] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { subscriptionStatus: "ACTIVE" } }),
    prisma.tenant.count({ where: { subscriptionStatus: "TRIALING" } }),
    prisma.appointment.count(),
  ]);

  return { totalTenants, activeTenants, trialingTenants, totalAppointments };
}

export default async function MasterDashboard() {
  const metrics = await getMasterMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Visão Geral da Plataforma</h2>
        <p className="text-zinc-400 mt-1">Acompanhe a saúde do TratoMarcado em tempo real.</p>
      </div>

      {/* Cartões de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-400 font-medium">Total de Salões</h3>
            <Users className="text-emerald-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-white mt-4">{metrics.totalTenants}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-400 font-medium">Salões Ativos</h3>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-white mt-4">{metrics.activeTenants}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-400 font-medium">Em Período de Teste</h3>
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-white mt-4">{metrics.trialingTenants}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-zinc-400 font-medium">Agendamentos Globais</h3>
            <CalendarCheck className="text-purple-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-white mt-4">{metrics.totalAppointments}</p>
        </div>
      </div>

      {/* Pode colocar o código da lista que enviou na imagem aqui em baixo, 
          ou movê-lo para a rota /master/saloes/page.tsx */}
    </div>
  );
}