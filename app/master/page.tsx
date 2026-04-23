import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Força a página a sempre buscar dados novos do banco (não fazer cache)
export const dynamic = "force-dynamic";

export default async function MasterPanel() {
  // Busca todos os salões cadastrados no banco
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionStatus: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-violet-500">Super Admin</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">TratoMarcado</h1>
          <p className="mt-2 text-zinc-400">Visão geral de todos os salões cadastrados no sistema.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-bold">Salões Ativos ({tenants.length})</h2>
          </div>

          <div className="mt-4 divide-y divide-zinc-800">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">{tenant.name}</h3>
                  <p className="font-mono text-sm text-zinc-500">/{tenant.slug}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Criado em {tenant.createdAt.toLocaleDateString("pt-BR")}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    tenant.subscriptionStatus === "ACTIVE" 
                      ? "bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20" 
                      : "bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700"
                  }`}>
                    {tenant.subscriptionStatus}
                  </span>

                  <Link 
                    href={`/admin/${tenant.slug}`}
                    target="_blank"
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    Acessar Painel
                  </Link>
                </div>
              </div>
            ))}
            
            {tenants.length === 0 && (
              <div className="py-8 text-center text-zinc-500">
                Nenhum salão cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}