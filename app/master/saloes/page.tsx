import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Store, ExternalLink, MoreVertical, CheckCircle2, Clock } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

async function getTenants() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Busca todos os salões, ordenados pelos mais recentes
  return await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { 
          appointments: {
            where: {
              createdAt: { gte: startOfMonth }
            }
          },
          professionals: true
        }
      }
    }
  });
}

export default async function SaloesMasterPage() {
  const tenants = await getTenants();
  const TZ = "America/Sao_Paulo";
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white">Gestão de Salões</h2>
          <p className="text-zinc-400 mt-1">Administre seus clientes e acesse os painéis.</p>
        </div>
        <div className="bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
          <span className="text-zinc-400 text-sm">Total de clientes: </span>
          <span className="text-white font-bold">{tenants.length}</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900/50 border-b border-zinc-800 uppercase text-xs font-semibold text-zinc-500">
            <tr>
              <th className="px-6 py-4">Salão</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Agendamentos</th>
              <th className="px-6 py-4">Profissionais</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 p-2 rounded-md text-zinc-400">
                      <Store size={18} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{tenant.name}</p>
                      <p className="text-xs text-zinc-500">/{tenant.slug}</p>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {tenant.subscriptionStatus === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 size={14} />
                      Ativo
                    </span>
                  ) : tenant.subscriptionStatus === "TRIALING" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Clock size={14} />
                      Em Teste
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                      Bloqueado
                    </span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <span className="text-zinc-300 font-medium">{tenant._count.appointments}</span>
                </td>
                
                <td className="px-6 py-4">
                  <span className="text-zinc-300 font-medium">{tenant._count.professionals}</span>
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Botão de Impersonation (Entrar como se fosse o cliente) */}
                    <Link 
                      href={`/admin/${tenant.slug}?date=${today}`} 
                      target="_blank"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors"
                    >
                      Acessar Painel
                      <ExternalLink size={14} />
                    </Link>
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {tenants.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            Nenhum salão cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}