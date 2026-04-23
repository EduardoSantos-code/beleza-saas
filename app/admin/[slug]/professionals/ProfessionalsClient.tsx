"use client";

import { useEffect, useState } from "react";

export default function ProfessionalsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editRows, setEditRows] = useState<Record<string, any>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/${slug}/professionals`);
    const json = await res.json();
    setData(json);
    
    // Prepara o estado de edição para cada profissional da lista
    const rows: any = {};
    json.professionals.forEach((p: any) => {
      rows[p.id] = { name: p.name, phoneE164: p.phoneE164 || "+55", active: p.active };
    });
    setEditRows(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, [slug]);

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

  if (loading) return <div className="p-10">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold">Equipe</h1>
      <div className="grid gap-4">
        {data?.professionals.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs text-zinc-500 uppercase font-bold">Nome</label>
              <input 
                className="w-full mt-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg"
                value={editRows[p.id]?.name}
                onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], name: e.target.value}})}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs text-zinc-500 uppercase font-bold">WhatsApp</label>
              <input 
                className="w-full mt-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg"
                value={editRows[p.id]?.phoneE164}
                onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], phoneE164: e.target.value}})}
              />
            </div>
            <div className="flex items-center gap-2 pb-3">
              <input 
                type="checkbox"
                checked={editRows[p.id]?.active}
                onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], active: e.target.checked}})}
              />
              <span className="text-sm">Ativo</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSave(p.id)}
                disabled={savingId === p.id}
                className="bg-violet-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
              >
                {savingId === p.id ? "Salvando..." : "Salvar"}
              </button>
              <button 
                onClick={() => handleDelete(p.id)}
                className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-bold text-sm"
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