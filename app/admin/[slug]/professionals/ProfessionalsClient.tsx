"use client";

import { useEffect, useState } from "react";

export default function ProfessionalsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editRows, setEditRows] = useState<Record<string, any>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Estados para o NOVO profissional
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+55");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/professionals`);
      const json = await res.json();
      setData(json);
      
      const rows: any = {};
      json.professionals.forEach((p: any) => {
        rows[p.id] = { name: p.name, phoneE164: p.phoneE164 || "+55", active: p.active };
      });
      setEditRows(rows);
    } catch (err) {
      console.error("Erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [slug]);

  // FUNÇÃO PARA CRIAR NOVO PROFISSIONAL
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return alert("O nome é obrigatório");

    try {
      setCreating(true);
      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phoneE164: newPhone }),
      });

      if (res.ok) {
        setNewName("");
        setNewPhone("+55");
        load(); // Recarrega a lista
      } else {
        alert("Erro ao criar profissional");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(id: string) {
    setSavingId(id);
    const row = editRows[id];
    await fetch(`/api/admin/${slug}/professionals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    setSavingId(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza? Isso pode afetar agendamentos antigos.")) return;
    await fetch(`/api/admin/${slug}/professionals/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="p-10 text-zinc-500">Carregando equipe...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipe</h1>
      </div>

      {/* CARD DE CRIAÇÃO (O que tinha sumido) */}
      <section className="bg-violet-600/5 border border-violet-600/20 p-6 rounded-2xl">
        <h2 className="text-sm font-bold uppercase text-violet-600 mb-4">Adicionar Novo Profissional</h2>
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-zinc-500 uppercase font-bold">Nome Completo</label>
            <input 
              className="w-full mt-1 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 ring-violet-500"
              placeholder="Ex: João Silva"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-zinc-500 uppercase font-bold">WhatsApp (Com DDD)</label>
            <input 
              className="w-full mt-1 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 ring-violet-500"
              placeholder="+55..."
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={creating}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg font-bold transition disabled:opacity-50"
          >
            {creating ? "Criando..." : "Adicionar"}
          </button>
        </form>
      </section>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* LISTAGEM E EDIÇÃO */}
      <div className="grid gap-4">
        <h2 className="text-sm font-bold uppercase text-zinc-500">Profissionais Cadastrados</h2>
        {data?.professionals.length === 0 && (
          <p className="text-zinc-500 text-sm italic">Nenhum profissional cadastrado ainda.</p>
        )}
        {data?.professionals.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-end transition-all hover:shadow-md">
            <div className="flex-1 w-full">
              <label className="text-xs text-zinc-500 uppercase font-bold">Nome</label>
              <input 
                className="w-full mt-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg border border-transparent focus:border-violet-500 outline-none"
                value={editRows[p.id]?.name}
                onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], name: e.target.value}})}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-zinc-500 uppercase font-bold">WhatsApp</label>
              <input 
                className="w-full mt-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg border border-transparent focus:border-violet-500 outline-none"
                value={editRows[p.id]?.phoneE164}
                onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], phoneE164: e.target.value}})}
              />
            </div>
            <div className="flex items-center gap-2 pb-3">
              <input 
                type="checkbox"
                className="w-4 h-4 accent-violet-600"
                checked={editRows[p.id]?.active}
                onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], active: e.target.checked}})}
              />
              <span className="text-sm font-medium">Ativo</span>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={() => handleSave(p.id)}
                disabled={savingId === p.id}
                className="flex-1 md:flex-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg font-bold text-sm transition hover:opacity-80"
              >
                {savingId === p.id ? "..." : "Salvar"}
              </button>
              <button 
                onClick={() => handleDelete(p.id)}
                className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}