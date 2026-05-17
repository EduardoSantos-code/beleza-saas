import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Clock3,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

async function getWhatsAppOverview() {
  const [totalTenants, configured, connected, connecting, disconnected, tenants] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.whatsappConfig.count(),
      prisma.whatsappConfig.count({
        where: { status: "OPEN" },
      }),
      prisma.whatsappConfig.count({
        where: { status: "CONNECTING" },
      }),
      prisma.whatsappConfig.count({
        where: {
          status: "DISCONNECTED",
        },
      }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          planStatus: true,
          subscriptionStatus: true,
          whatsappConfig: {
            select: {
              instanceName: true,
              status: true,
              connectedPhone: true,
              profileName: true,
              lastConnectionAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

  return {
    totalTenants,
    configured,
    connected,
    connecting,
    disconnected,
    notConfigured: Math.max(totalTenants - configured, 0),
    tenants,
  };
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "red" | "zinc";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        <div className={`rounded-lg border p-2 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-2xl font-bold text-white sm:text-3xl">{value}</p>
    </div>
  );
}

function statusBadge(status?: string | null) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "OPEN":
      return {
        className:
          `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-500`,
        label: "Conectado",
        icon: <Wifi size={14} />,
      };
    case "CONNECTING":
      return {
        className:
          `${base} border-amber-500/20 bg-amber-500/10 text-amber-500`,
        label: "Conectando",
        icon: <Clock3 size={14} />,
      };
    case "DISCONNECTED":
      return {
        className:
          `${base} border-red-500/20 bg-red-500/10 text-red-500`,
        label: "Desconectado",
        icon: <WifiOff size={14} />,
      };
    default:
      return {
        className: `${base} border-zinc-700 bg-zinc-800 text-zinc-300`,
        label: "Sem configuração",
        icon: <AlertCircle size={14} />,
      };
  }
}

export default async function WhatsAppMasterPage() {
  const data = await getWhatsAppOverview();
  const TZ = "America/Sao_Paulo";
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Central do WhatsApp
        </h2>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Visão geral das conexões de WhatsApp por barbearia.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total de salões"
          value={data.totalTenants}
          icon={<MessageCircle size={20} />}
          tone="zinc"
        />
        <MetricCard
          title="Com WhatsApp configurado"
          value={data.configured}
          icon={<MessageCircle size={20} />}
          tone="zinc"
        />
        <MetricCard
          title="Conectados"
          value={data.connected}
          icon={<Wifi size={20} />}
          tone="emerald"
        />
        <MetricCard
          title="Conectando"
          value={data.connecting}
          icon={<Clock3 size={20} />}
          tone="amber"
        />
        <MetricCard
          title="Desconectados / sem config"
          value={data.disconnected + data.notConfigured}
          icon={<WifiOff size={20} />}
          tone="red"
        />
      </div>

      {data.tenants.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
          Nenhuma barbearia cadastrada ainda.
        </div>
      )}

      {/* Mobile: cards */}
      {data.tenants.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {data.tenants.map((tenant) => {
            const badge = statusBadge(tenant.whatsappConfig?.status);

            return (
              <div
                key={tenant.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div>
                  <p className="font-medium text-white">{tenant.name}</p>
                  <p className="text-xs text-zinc-500">/{tenant.slug}</p>
                </div>

                <div className="mt-4">
                  <span className={badge.className}>
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Telefone</p>
                    <p className="mt-1 break-all text-zinc-200">
                      {tenant.whatsappConfig?.connectedPhone || "-"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Perfil</p>
                    <p className="mt-1 break-words text-zinc-200">
                      {tenant.whatsappConfig?.profileName || "-"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Instância</p>
                    <p className="mt-1 break-all font-mono text-xs text-zinc-300">
                      {tenant.whatsappConfig?.instanceName || "-"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Última conexão</p>
                    <p className="mt-1 text-zinc-200">
                      {tenant.whatsappConfig?.lastConnectionAt
                        ? new Date(
                            tenant.whatsappConfig.lastConnectionAt
                          ).toLocaleString("pt-BR")
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/admin/${tenant.slug}/whatsapp`}
                    target="_blank"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                  >
                    Abrir WhatsApp
                    <ExternalLink size={14} />
                  </Link>

                  <Link
                    href={`/admin/${tenant.slug}?date=${today}`}
                    target="_blank"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    Abrir Painel
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: tabela */}
      {data.tenants.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 md:block">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Status por barbearia
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Cada tenant usa sua própria instância da Evolution.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm text-zinc-400">
              <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Salão</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4">Instância</th>
                  <th className="px-6 py-4">Última conexão</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {data.tenants.map((tenant) => {
                  const badge = statusBadge(tenant.whatsappConfig?.status);

                  return (
                    <tr
                      key={tenant.id}
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{tenant.name}</p>
                          <p className="text-xs text-zinc-500">/{tenant.slug}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={badge.className}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-zinc-300">
                        {tenant.whatsappConfig?.connectedPhone || "-"}
                      </td>

                      <td className="px-6 py-4 text-zinc-300">
                        {tenant.whatsappConfig?.profileName || "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-zinc-400">
                          {tenant.whatsappConfig?.instanceName || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-zinc-400">
                        {tenant.whatsappConfig?.lastConnectionAt
                          ? new Date(
                              tenant.whatsappConfig.lastConnectionAt
                            ).toLocaleString("pt-BR")
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/${tenant.slug}/whatsapp`}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
                          >
                            Abrir WhatsApp
                            <ExternalLink size={14} />
                          </Link>

                          <Link
                            href={`/admin/${tenant.slug}?date=${today}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                          >
                            Abrir Painel
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
