"use client";

import { useEffect, useState } from "react";

type Professional = {
  id: string;
  name: string;
  active: boolean;
};

type ResponseData = {
  tenant: {
    id: string;
    name: string;
  };
  professionals: Professional[];
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

export default function ProfessionalsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [editRows, setEditRows] = useState<
    Record<string, { name: string; active: boolean }>
  >({});

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadProfessionals() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar profissionais");
      }

      setData(json);

      const rows: Record<string, { name: string; active: boolean }> = {};

      for (const professional of json.professionals) {
        rows[professional.id] = {
          name: professional.name,
          active: professional.active,
        };
      }

      setEditRows(rows);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar profissionais");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfessionals();
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSavingCreate(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          active: true,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao criar profissional");
      }

      setSuccessMessage("Profissional criada com sucesso.");
      setNewName("");

      await loadProfessionals();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao criar profissional");
    } finally {
      setSavingCreate(false);
    }
  }

  async function handleSave(id: string) {
    try {
      setSavingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const row = editRows[id];

      const res = await fetch(`/api/admin/${slug}/professionals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: row.name,
          active: row.active,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar profissional");
      }

      setSuccessMessage("Profissional atualizada com sucesso.");
      await loadProfessionals();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao salvar profissional");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja excluir esta profissional?");
    if (!confirmed) return;

    try {
      setSavingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/professionals/${id}`, {
        method: "DELETE",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao excluir profissional");
      }

      setSuccessMessage("Profissional excluída com sucesso.");
      await loadProfessionals();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao excluir profissional");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-violet-600">
              Cadastros
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900">
              Profissionais
            </h1>
            <p className="mt-2 text-zinc-600">
              Gerencie as profissionais do salão.
            </p>
          </div>

          <a
            href={`/admin/${slug}`}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Voltar para agenda
          </a>
        </div>

        {errorMessage && (
          <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Nova profissional
          </h2>

          <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Fernanda"
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              required
            />

            <button
              type="submit"
              disabled={savingCreate}
              className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {savingCreate ? "Salvando..." : "Criar profissional"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              Lista de profissionais
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-zinc-600">Carregando...</div>
          ) : !data?.professionals.length ? (
            <div className="p-6 text-zinc-600">
              Nenhuma profissional cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {data.professionals.map((professional) => {
                const row = editRows[professional.id];
                if (!row) return null;

                return (
                  <div
                    key={professional.id}
                    className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_140px_auto]"
                  >
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          setEditRows((current) => ({
                            ...current,
                            [professional.id]: {
                              ...current[professional.id],
                              name: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(e) =>
                            setEditRows((current) => ({
                              ...current,
                              [professional.id]: {
                                ...current[professional.id],
                                active: e.target.checked,
                              },
                            }))
                          }
                        />
                        Ativa
                      </label>
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(professional.id)}
                        disabled={savingId === professional.id}
                        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Salvar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(professional.id)}
                        disabled={savingId === professional.id}
                        className="rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}