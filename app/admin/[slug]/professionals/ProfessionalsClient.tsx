"use client";

import { useEffect, useState } from "react";
import { UserPlus, Save, Trash2, User, Phone, CheckCircle2, XCircle } from "lucide-react";

export default function ProfessionalsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editRows, setEditRows] = useState<Record<string, any>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+55");
  const [newCommissionRate, setNewCommissionRate] = useState(50);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/professionals`);
      const json = await res.json();
      setData(json);
      
      const rows: any = {};
      json.professionals.forEach((p: any) => {
        rows[p.id] = { name: p.name, phoneE164: p.phoneE164 || "+55", active: p.active, commissionRate: p.commissionRate ?? 50 };
      });
      setEditRows(rows);
    } catch (err) {
      console.error("Erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return alert("O nome é obrigatório");

    try {
      setCreating(true);
      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phoneE164: newPhone, commissionRate: newCommissionRate }),
      });

      if (res.ok) {
        setNewName("");
        setNewPhone("+55");
        setNewCommissionRate(50);
        load();
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

  if (loading) return (
    <div className="p-10 flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
      <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
      Carregando equipe...
    </div>
  );

  return (
    <div className="space-y-10 max-w-5xl mx-auto p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">Equipe</h1>
        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
          {data?.professionals.length || 0} Profissionais
        </div>
      </div>

      {/* SEÇÃO: ADICIONAR NOVO */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-500">
          <UserPlus className="h-5 w-5" />
          <h2 className="text-sm font-black uppercase tracking-widest">Novo Profissional</h2>
        </div>
        
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-4">
            <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input 
                className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                placeholder="Ex: João Silva"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="md:col-span-3">
            <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input 
                className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                placeholder="+55..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Comissão (%)</label>
            <div className="relative">
              <input 
                type="number"
                min="0"
                max="100"
                className="w-full bg-zinc-50 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                value={newCommissionRate}
                onChange={(e) => setNewCommissionRate(Number(e.target.value))}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={creating}
            className="md:col-span-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {creating ? "Criando..." : "Adicionar Membro"}
          </button>
        </form>
      </section>

      {/* LISTAGEM */}
      <div className="space-y-6">
        <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest px-1">Profissionais Cadastrados</h2>
        
        {data?.professionals.length === 0 && (
          <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800">
            <p className="text-zinc-500 text-sm italic">Sua equipe está vazia. Adicione o primeiro profissional acima.</p>
          </div>
        )}

        <div className="grid gap-4">
          {data?.professionals.map((p: any) => (
            <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-6 items-center transition-all hover:border-emerald-500/30">
              
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">Nome</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium focus:ring-1 ring-emerald-500 outline-none"
                    value={editRows[p.id]?.name}
                    onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], name: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">WhatsApp</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium focus:ring-1 ring-emerald-500 outline-none"
                    value={editRows[p.id]?.phoneE164}
                    onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], phoneE164: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">Comissão (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium focus:ring-1 ring-emerald-500 outline-none"
                    value={editRows[p.id]?.commissionRate}
                    onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], commissionRate: Number(e.target.value)}})}
                  />
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    className="hidden"
                    checked={editRows[p.id]?.active}
                    onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], active: e.target.checked}})}
                  />
                  {editRows[p.id]?.active ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-zinc-400" />
                  )}
                  <span className={`text-sm font-bold ${editRows[p.id]?.active ? 'text-emerald-600' : 'text-zinc-500'}`}>
                    {editRows[p.id]?.active ? 'Ativo' : 'Inativo'}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => handleSave(p.id)}
                  disabled={savingId === p.id}
                  className="flex-1 md:flex-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl font-bold text-sm transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingId === p.id ? "..." : "Salvar"}
                </button>
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="p-2.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  title="Excluir"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}