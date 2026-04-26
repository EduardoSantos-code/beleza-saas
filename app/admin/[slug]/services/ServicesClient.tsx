"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  active: boolean;
};

type ResponseData = {
  tenant: {
    id: string;
    name: string;
  };
  services: Service[];
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

function centsToBRL(cents: number) {
  return (cents / 100).toFixed(2);
}

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

      const res = await fetch(`/api/admin/${slug}/services`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar serviços");
      }

      setData(json);

      const rows: Record<
        string,
        { name: string; durationMin: string; price: string; active: boolean }
      > = {};

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
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [slug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSavingCreate(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          durationMin: Number(newDurationMin),
          price: brlToCents(newPrice),
          active: true,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao criar serviço");
      }

      setSuccessMessage("Serviço criado com sucesso.");
      setNewName("");
      setNewDurationMin("60");
      setNewPrice("70.00");

      await loadServices();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao criar serviço");
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

      const res = await fetch(`/api/admin/${slug}/services/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: row.name,
          durationMin: Number(row.durationMin),
          price: brlToCents(row.price),
          active: row.active,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar serviço");
      }

      setSuccessMessage("Serviço atualizado com sucesso.");
      await loadServices();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao salvar serviço");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja excluir este serviço?");
    if (!confirmed) return;

    try {
      setSavingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/services/${id}`, {
        method: "DELETE",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao excluir serviço");
      }

      setSuccessMessage("Serviço excluído com sucesso.");
      await loadServices();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao excluir serviço");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-red-600 dark:text-red-400">
          {errorMessage || "Não foi possível carregar a página."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Cadastros
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">Serviços</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Gerencie os serviços do salão.
          </p>
        </div>

        <a
          href={`/admin/${slug}`}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
        >
          Voltar para agenda
        </a>
      </div>

      {errorMessage && (
        <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Novo serviço</h2>

        <form onSubmit={handleCreate} className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Corte feminino"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Duração (min)
            </label>
            <input
              type="number"
              value={newDurationMin}
              onChange={(e) => setNewDurationMin(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              min={5}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Preço (R$)
            </label>
            <input
              type="text"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              required
            />
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={savingCreate}
              className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
            >
              {savingCreate ? "Salvando..." : "Criar serviço"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Lista de serviços
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">Carregando...</div>
        ) : !data?.services.length ? (
          <div className="p-6 text-zinc-600 dark:text-zinc-400">Nenhum serviço cadastrado.</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.services.map((service) => {
              const row = editRows[service.id];
              if (!row) return null;

              return (
                <div
                  key={service.id}
                  className="grid gap-4 px-6 py-5 md:grid-cols-[2fr_140px_140px_120px_auto]"
                >
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        setEditRows((current) => ({
                          ...current,
                          [service.id]: {
                            ...current[service.id],
                            name: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Duração
                    </label>
                    <input
                      type="number"
                      value={row.durationMin}
                      onChange={(e) =>
                        setEditRows((current) => ({
                          ...current,
                          [service.id]: {
                            ...current[service.id],
                            durationMin: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Preço
                    </label>
                    <input
                      type="text"
                      value={row.price}
                      onChange={(e) =>
                        setEditRows((current) => ({
                          ...current,
                          [service.id]: {
                            ...current[service.id],
                            price: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-3 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(e) =>
                          setEditRows((current) => ({
                            ...current,
                            [service.id]: {
                              ...current[service.id],
                              active: e.target.checked,
                            },
                          }))
                        }
                        className="h-5 w-5 rounded border-zinc-300 text-violet-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      Ativo
                    </label>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(service.id)}
                      disabled={savingId === service.id}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
                    >
                      Salvar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      disabled={savingId === service.id}
                      className="rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition"
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
  );
}