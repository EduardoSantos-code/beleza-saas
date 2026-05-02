"use client";

import { useEffect, useState } from "react";
import { 
  Scissors, 
  Clock, 
  DollarSign, 
  PlusCircle, 
  Save, 
  Trash2, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Tag
} from "lucide-react";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  active: boolean;
};

type ResponseData = {
  tenant: { id: string; name: string; };
  services: Service[];
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } 
  catch { throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`); }
}

function centsToBRL(cents: number) { return (cents / 100).toFixed(2); }

function brlToCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  const number = Number(normalized);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100);
}

export default function ServicesClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDurationMin, setNewDurationMin] = useState("60");
  const [newPrice, setNewPrice] = useState("70.00");

  const [editRows, setEditRows] = useState<
    Record<string, { name: string; durationMin: string; price: string; active: boolean }>
  >({});

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadServices() {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await fetch(`/api/admin/${slug}/services`, { method: "GET", cache: "no-store" });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar serviços");
      setData(json);

      const rows: any = {};
      for (const service of json.services) {
        rows[service.id] = {
          name: service.name,
          durationMin: String(service.durationMin),
          price: centsToBRL(service.price),
          active: service.active,
        };
      }
      setEditRows(rows);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadServices(); }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingCreate(true);
      setErrorMessage("");
      setSuccessMessage("");
      const res = await fetch(`/api/admin/${slug}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          durationMin: Number(newDurationMin),
          price: brlToCents(newPrice),
          active: true,
        }),
      });
      const json = await readJsonSafe(res);
      if (!res.ok) throw new Error(json?.error || "Erro ao criar serviço");
      setSuccessMessage("Serviço criado com sucesso.");
      setNewName("");
      setNewDurationMin("60");
      setNewPrice("70.00");
      await loadServices();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao criar serviço");
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleSave(id: string) {
    try {
      setSavingId(id);
      const row = editRows[id];
      const res = await fetch(`/api/admin/${slug}/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          durationMin: Number(row.durationMin),
          price: brlToCents(row.price),
          active: row.active,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar serviço");
      setSuccessMessage("Serviço atualizado com sucesso.");
      await loadServices();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja excluir este serviço?")) return;
    try {
      setSavingId(id);
      const res = await fetch(`/api/admin/${slug}/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir serviço");
      await loadServices();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return (
    <div className="p-10 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-bold">
      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
      Carregando serviços...
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-20 p-4">
      {/* HEADER */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-xs">
            <Scissors className="h-4 w-4" />
            Configurações
          </div>
          <h1 className="mt-2 text-4xl font-black text-zinc-900 dark:text-white italic">Serviços</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 font-medium">
            Defina o que você oferece e quanto cobra.
          </p>
        </div>

        <a
          href={`/admin/${slug}`}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para agenda
        </a>
      </div>

      {/* MENSAGENS */}
      {(errorMessage || successMessage) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
          errorMessage 
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400" 
            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
        }`}>
          {errorMessage || successMessage}
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO */}
      <section className="rounded-3xl bg-white p-8 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
        <div className="flex items-center gap-2 mb-8 text-emerald-600 dark:text-emerald-500">
          <PlusCircle className="h-6 w-6" />
          <h2 className="text-sm font-black uppercase tracking-widest">Novo Serviço</h2>
        </div>

        <form onSubmit={handleCreate} className="grid gap-6 md:grid-cols-4 items-end">
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 tracking-wide">
              Nome do Serviço
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Corte Degradê"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3.5 text-zinc-900 font-bold outline-none focus:ring-2 ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 tracking-wide">
              Duração (min)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="number"
                value={newDurationMin}
                onChange={(e) => setNewDurationMin(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3.5 text-zinc-900 font-bold outline-none focus:ring-2 ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all"
                min={5}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 tracking-wide">
              Preço (R$)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3.5 text-zinc-900 font-bold outline-none focus:ring-2 ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all"
                required
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={savingCreate}
              className="w-full md:w-auto rounded-xl bg-emerald-600 px-8 py-4 font-black text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all uppercase tracking-widest text-sm"
            >
              {savingCreate ? "Processando..." : "Criar Serviço"}
            </button>
          </div>
        </form>
      </section>

      {/* LISTAGEM */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
        <div className="border-b border-zinc-100 px-8 py-5 dark:border-zinc-800">
          <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest">
            Serviços Atuais
          </h2>
        </div>

        {!data?.services.length ? (
          <div className="p-10 text-center text-zinc-500 italic font-medium">Nenhum serviço cadastrado ainda.</div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.services.map((service) => {
              const row = editRows[service.id];
              if (!row) return null;

              return (
                <div
                  key={service.id}
                  className="grid gap-6 px-8 py-6 md:grid-cols-[1.5fr_1fr_1fr_100px_auto] items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Nome</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => setEditRows(c => ({...c, [service.id]: {...c[service.id], name: e.target.value}}))}
                      className="w-full rounded-lg border border-transparent bg-zinc-100 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white font-bold focus:ring-1 ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Duração (min)</label>
                    <input
                      type="number"
                      value={row.durationMin}
                      onChange={(e) => setEditRows(c => ({...c, [service.id]: {...c[service.id], durationMin: e.target.value}}))}
                      className="w-full rounded-lg border border-transparent bg-zinc-100 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white font-bold focus:ring-1 ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Preço (R$)</label>
                    <input
                      type="text"
                      value={row.price}
                      onChange={(e) => setEditRows(c => ({...c, [service.id]: {...c[service.id], price: e.target.value}}))}
                      className="w-full rounded-lg border border-transparent bg-zinc-100 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-white font-bold focus:ring-1 ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Status</label>
                    <button
                      type="button"
                      onClick={() => setEditRows(c => ({...c, [service.id]: {...c[service.id], active: !c[service.id].active}}))}
                      className="transition-transform active:scale-90"
                    >
                      {row.active ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                      ) : (
                        <XCircle className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-4 md:pt-0">
                    <button
                      type="button"
                      onClick={() => handleSave(service.id)}
                      disabled={savingId === service.id}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-3 text-sm font-black text-white dark:text-zinc-900 hover:opacity-80 transition shadow-md"
                    >
                      <Save className="h-4 w-4" />
                      {savingId === service.id ? "..." : "Salvar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      disabled={savingId === service.id}
                      className="p-3 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}