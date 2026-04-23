"use client";

import { useEffect, useState } from "react";

type Professional = { id: string; name: string; phoneE164: string; active: boolean };
type ResponseData = { tenant: { id: string; name: string }; professionals: Professional[] };

// ... (mesmas funções auxiliares readJsonSafe)

export default function ProfessionalsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+55"); // Estado para o novo telefone
  
  const [editRows, setEditRows] = useState<Record<string, { name: string; phoneE164: string; active: boolean }>>({});

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadProfessionals() {
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { loadProfessionals(); }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingCreate(true);
      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phoneE164: newPhone, active: true }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      setNewName(""); setNewPhone("+55");
      await loadProfessionals();
    } catch (err: any) { setErrorMessage(err.message); } finally { setSavingCreate(false); }
  }

  async function handleSave(id: string) {
    try {
      setSavingId(id);
      const row = editRows[id];
      const res = await fetch(`/api/admin/${slug}/professionals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: row.name, phoneE164: row.phoneE164, active: row.active }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      await loadProfessionals();
    } catch (err: any) { setErrorMessage(err.message); } finally { setSavingId(null); }
  }

  // ... (mesma função handleDelete)

  if (loading) return <div className="p-8 text-zinc-500 dark:text-zinc-400">Carregando profissionais...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Cabeçalho omitido para brevidade */}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Nova profissional</h2>
        <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-4 md:flex-row">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" required />
          <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="WhatsApp (Ex: +55119...)" className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" required />
          <button type="submit" disabled={savingCreate} className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60">Criar profissional</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {data?.professionals.map((professional) => {
            const row = editRows[professional.id];
            if (!row) return null;
            return (
              <div key={professional.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_1fr_120px_auto]">
                <div>
                  <label className="mb-2 block text-xs uppercase text-zinc-500">Nome</label>
                  <input type="text" value={row.name} onChange={(e) => setEditRows(curr => ({ ...curr, [professional.id]: { ...curr[professional.id], name: e.target.value } }))} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase text-zinc-500">WhatsApp Notificação</label>
                  <input type="text" value={row.phoneE164} onChange={(e) => setEditRows(curr => ({ ...curr, [professional.id]: { ...curr[professional.id], phoneE164: e.target.value } }))} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                </div>
                {/* Checkbox Ativo e Botões de Salvar/Excluir seguem o mesmo padrão */}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}