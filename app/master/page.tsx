import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  Wifi,
  WifiOff,
  Store,
  XCircle,
} from "lucide-react";
import { subDays } from "date-fns";

async function getMasterMetrics() {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [
    totalTenants,
    activeTenants,
    trialingTenants,
    overdueTenants,
    expiredTenants,
    totalAppointments,
    recentAppointments,
    whatsappConnected,
    whatsappDisconnected,
    latestTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { planStatus: "ACTIVE" } }),
    prisma.tenant.count({ where: { planStatus: "TRIAL" } }),
    prisma.tenant.count({ where: { planStatus: "OVERDUE" } }),
    prisma.tenant.count({ where: { planStatus: "EXPIRED" } }),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.whatsappConfig.count({
      where: {
        status: "OPEN",
      },
    }),
    prisma.whatsappConfig.count({
      where: {
        OR: [{ status: "DISCONNECTED" }, { status: "CONNECTING" }],
      },
    }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        planStatus: true,
        createdAt: true,
        whatsappConfig: {
          select: {
            status: true,
            connectedPhone: true,
          },
        },
      },
    }),
  ]);

  return {
    totalTenants,
    activeTenants,
    trialingTenants,
    overdueTenants,
    expiredTenants,
    totalAppointments,
    recentAppointments,
    whatsappConnected,
    whatsappDisconnected,
    latestTenants,
  };
}

function MetricCard({
  title,
  value,
  icon,
  iconColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-tight text-zinc-400">
          {title}
        </h3>
        <div className={iconColor}>{icon}</div>
      </div>
      <p className="mt-4 text-2xl font-bold text-white sm:text-3xl">{value}</p>
    </div>
  );
}

function statusBadge(status: string | null | undefined) {
  const base =
    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "ACTIVE":
      return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-500`;
    case "TRIAL":
      return `${base} border-amber-500/20 bg-amber-500/10 text-amber-500`;
    case "OVERDUE":
      return `${base} border-orange-500/20 bg-orange-500/10 text-orange-400`;
    case "EXPIRED":
      return `${base} border-red-500/20 bg-red-500/10 text-red-500`;
    default:
      return `${base} border-zinc-700 bg-zinc-800 text-zinc-300`;
  }
}

function statusLabel(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "TRIAL":
      return "Em Teste";
    case "OVERDUE":
      return "Em Atraso";
    case "EXPIRED":
      return "Expirado";
    default:
      return status || "N/A";
  }
}

function whatsappBadge(status: string | null | undefined) {
  const base =
    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "OPEN":
      return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-500`;
    case "CONNECTING":
      return `${base} border-amber-500/20 bg-amber-500/10 text-amber-500`;
    case "DISCONNECTED":
      return `${base} border-red-500/20 bg-red-500/10 text-red-500`;
    default:
      return `${base} border-zinc-700 bg-zinc-800 text-zinc-300`;
  }
}

function whatsappLabel(status: string | null | undefined) {
  switch (status) {
    case "OPEN":
      return "Conectado";
    case "CONNECTING":
      return "Conectando";
    case "DISCONNECTED":
      return "Desconectado";
    default:
      return "Sem config";
  }
}

export default async function MasterDashboard() {
  const metrics = await getMasterMetrics();

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Visão Geral da Plataforma
        </h2>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Acompanhe a saúde do TratoMarcado em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total de Salões"
          value={metrics.totalTenants}
          icon={<Users size={20} />}
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Salões Ativos"
          value={metrics.activeTenants}
          icon={<TrendingUp size={20} />}
          iconColor="text-blue-500"
        />
        <MetricCard
          title="WhatsApp Conectado"
          value={metrics.whatsappConnected}
          icon={<Wifi size={20} />}
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Em Período de Teste"
          value={metrics.trialingTenants}
          icon={<AlertTriangle size={20} />}
          iconColor="text-amber-500"
        />
        <MetricCard
          title="Em Atraso"
          value={metrics.overdueTenants}
          icon={<AlertTriangle size={20} />}
          iconColor="text-orange-400"
        />
        <MetricCard
          title="Salões Expirados"
          value={metrics.expiredTenants}
          icon={<XCircle size={20} />}
          iconColor="text-red-500"
        />
        <MetricCard
          title="Agendamentos Globais"
          value={metrics.totalAppointments}
          icon={<CalendarCheck size={20} />}
          iconColor="text-purple-500"
        />
        <MetricCard
          title="Agendamentos últimos 30 dias"
          value={metrics.recentAppointments}
          icon={<CalendarCheck size={20} />}
          iconColor="text-fuchsia-500"
        />
        <MetricCard
          title="WhatsApp com Atenção"
          value={metrics.whatsappDisconnected}
          icon={<WifiOff size={20} />}
          iconColor="text-red-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
        <div className="border-b border-zinc-800 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white">
            Últimos salões cadastrados
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Visão rápida dos tenants mais recentes.
          </p>
        </div>

        {metrics.latestTenants.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            Nenhum salão cadastrado ainda.
          </div>
        )}

        {/* Mobile: cards */}
        {metrics.latestTenants.length > 0 && (
          <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
            {metrics.latestTenants.map((tenant) => (
              <div
                key={tenant.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-zinc-800 p-2 text-zinc-400">
                    <Store size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {tenant.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      /{tenant.slug}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-zinc-500">Assinatura</p>
                    <span className={statusBadge(tenant.planStatus)}>
                      {statusLabel(tenant.planStatus)}
                    </span>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-zinc-500">WhatsApp</p>
                    <span className={whatsappBadge(tenant.whatsappConfig?.status)}>
                      {whatsappLabel(tenant.whatsappConfig?.status)}
                    </span>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-zinc-500">Telefone</p>
                    <p className="break-all text-sm text-zinc-300">
                      {tenant.whatsappConfig?.connectedPhone || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-zinc-500">Criado em</p>
                    <p className="text-sm text-zinc-300">
                      {new Date(tenant.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop: tabela */}
        {metrics.latestTenants.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-950/40">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">
                    Salão
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">
                    Assinatura
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">
                    WhatsApp
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-400">
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.latestTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-t border-zinc-800"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {tenant.slug}
                    </td>
                    <td className="px-6 py-4">
                      <span className={statusBadge(tenant.planStatus)}>
                        {statusLabel(tenant.planStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={whatsappBadge(tenant.whatsappConfig?.status)}>
                        {whatsappLabel(tenant.whatsappConfig?.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {tenant.whatsappConfig?.connectedPhone || "-"}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(tenant.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-zinc-800 p-4">
          <Link
            href="/master/saloes"
            className="text-sm font-medium text-blue-400 hover:underline"
          >
            Ver gestão completa de salões
          </Link>
        </div>
      </div>
    </div>
  );
}
