import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Store,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

async function getTenants() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      planStatus: true,
      subscriptionStatus: true,
      _count: {
        select: {
          appointments: {
            where: {
              createdAt: { gte: startOfMonth },
            },
          },
          professionals: true,
        },
      },
    },
  });
}

function getBillingBadge(planStatus: string | null | undefined) {
  const base =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border";

  switch (planStatus) {
    case "ACTIVE":
      return {
        className:
          `${base} bg-emerald-500/10 text-emerald-500 border-emerald-500/20`,
        label: "Ativo",
        icon: <CheckCircle2 size={14} />,
      };

    case "TRIAL":
      return {
        className:
          `${base} bg-amber-500/10 text-amber-500 border-amber-500/20`,
        label: "Em Teste",
        icon: <Clock size={14} />,
      };

    case "OVERDUE":
      return {
        className:
          `${base} bg-orange-500/10 text-orange-400 border-orange-500/20`,
        label: "Em Atraso",
        icon: <AlertTriangle size={14} />,
      };

    case "EXPIRED":
      return {
        className:
          `${base} bg-red-500/10 text-red-500 border-red-500/20`,
        label: "Expirado",
        icon: <XCircle size={14} />,
      };

    default:
      return {
        className: `${base} bg-zinc-800 text-zinc-300 border-zinc-700`,
        label: planStatus || "Desconhecido",
        icon: null,
      };
  }
}

export default async function SaloesMasterPage() {
  const tenants = await getTenants();
  const TZ = "America/Sao_Paulo";
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Gestão de Salões
          </h2>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">
            Administre seus clientes e acesse os painéis.
          </p>
        </div>

        <div className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 sm:w-auto">
          <span className="text-sm text-zinc-400">Total de clientes: </span>
          <span className="font-bold text-white">{tenants.length}</span>
        </div>
      </div>

      {tenants.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
          Nenhum salão cadastrado ainda.
        </div>
      )}

      {/* Mobile: cards */}
      {tenants.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {tenants.map((tenant) => {
            const badge = getBillingBadge(tenant.planStatus);

            return (
              <div
                key={tenant.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
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

                <div className="mt-4">
                  <span className={badge.className}>
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Agendamentos</p>
                    <p className="mt-1 font-semibold text-zinc-200">
                      {tenant._count.appointments}
                    </p>
                  </div>

                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Profissionais</p>
                    <p className="mt-1 font-semibold text-zinc-200">
                      {tenant._count.professionals}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/admin/${tenant.slug}?date=${today}`}
                    target="_blank"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                  >
                    Acessar Painel
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: tabela */}
      {tenants.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Salão</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Agendamentos</th>
                  <th className="px-6 py-4">Profissionais</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {tenants.map((tenant) => {
                  const badge = getBillingBadge(tenant.planStatus);

                  return (
                    <tr
                      key={tenant.id}
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-zinc-800 p-2 text-zinc-400">
                            <Store size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {tenant.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              /{tenant.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={badge.className}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-zinc-300">
                          {tenant._count.appointments}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-zinc-300">
                          {tenant._count.professionals}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/${tenant.slug}?date=${today}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
                          >
                            Acessar Painel
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
