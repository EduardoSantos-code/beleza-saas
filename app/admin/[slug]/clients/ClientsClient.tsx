"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";

type ClientData = {
  id: string;
  name: string;
  phoneE164: string | null;
  email: string | null;
  createdAt: string;
  completedCount: number;
  noShowCount: number;
  lateCancelCount: number;
};

export default function ClientsClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/${slug}/clients`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao carregar clientes.");
        setClients(json);
      } catch (error: any) {
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, [slug]);

  const filteredClients = clients.filter((c) => {
    const term = search.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(term);
    const phoneMatch = c.phoneE164 ? c.phoneE164.includes(term) : false;
    const emailMatch = c.email ? c.email.toLowerCase().includes(term) : false;
    return nameMatch || phoneMatch || emailMatch;
  });

  function formatPhone(phone: string | null) {
    if (!phone) return "Sem telefone";
    if (phone.startsWith("+55") && phone.length === 13) {
      return `(${phone.substring(3, 5)}) ${phone.substring(5, 9)}-${phone.substring(9)}`;
    } else if (phone.startsWith("+55") && phone.length === 14) {
      return `(${phone.substring(3, 5)}) ${phone.substring(5, 10)}-${phone.substring(10)}`;
    }
    return phone;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-bold">
        <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
        Carregando base de clientes...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-20">
      {/* HEADER */}
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
              Relacionamento
            </p>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white italic">Clientes Atendidos</h1>
          </div>
        </div>

        {/* PESQUISA */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por nome, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-5 py-4 text-sm font-bold shadow-xl ring-1 ring-zinc-200 outline-none transition-all bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white focus:ring-2 ring-emerald-500 rounded-2xl"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-sm font-bold">
          {errorMessage}
        </div>
      )}

      {/* LISTA DE CLIENTES */}
      <div className="rounded-3xl bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                <th className="p-6 text-[10px] font-black uppercase text-zinc-400">Cliente</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-400">Contato</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-400 text-center">Atendimentos</th>
                <th className="p-6 text-[10px] font-black uppercase text-red-500 text-center">Faltas (No-Show)</th>
                <th className="p-6 text-[10px] font-black uppercase text-amber-600 text-center">Canc. Recentes</th>
                <th className="p-6 text-[10px] font-black uppercase text-zinc-400 text-right">Membro Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-emerald-500 text-base">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-zinc-900 dark:text-white uppercase text-xs tracking-tight">
                          {client.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 space-y-1">
                    {client.phoneE164 && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-550 dark:text-zinc-400 font-bold">
                        <Phone size={12} className="text-zinc-400" />
                        {formatPhone(client.phoneE164)}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-550 dark:text-zinc-400 font-bold">
                        <Mail size={12} className="text-zinc-400" />
                        {client.email}
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                      <CheckCircle2 size={12} />
                      {client.completedCount}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs ${
                      client.noShowCount > 0 
                        ? "bg-red-50 dark:bg-red-500/10 text-red-500" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-450 dark:text-zinc-500"
                    }`}>
                      <XCircle size={12} />
                      {client.noShowCount}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs ${
                      client.lateCancelCount > 0 
                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-450 dark:text-zinc-500"
                    }`}>
                      <AlertCircle size={12} />
                      {client.lateCancelCount}
                    </span>
                  </td>
                  <td className="p-6 text-right text-xs font-bold text-zinc-500">
                    <div className="flex items-center justify-end gap-1.5">
                      <Calendar size={12} className="text-zinc-400" />
                      {formatDate(client.createdAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-450">
            <Users className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="font-black text-lg">Nenhum cliente encontrado</p>
            <p className="text-sm font-bold text-zinc-400 mt-1">Tente ajustar os termos da sua pesquisa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
