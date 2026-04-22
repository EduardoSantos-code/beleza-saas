"use client";

import { useEffect, useState } from "react";

type Professional = {
  id: string;
  name: string;
};

type BlockItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  professional: Professional | null;
};

type ResponseData = {
  tenant: {
    id: string;
    name: string;
  };
  professionals: Professional[];
  blocks: BlockItem[];
};

function formatLocalDateInput(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function BlocksClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [date, setDate] = useState(() => formatLocalDateInput(new Date()));
  const [title, setTitle] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  async function loadBlocks() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/blocks?date=${date}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await res.text();
      const json = JSON.parse(text);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar bloqueios");
      }

      setData(json);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar bloqueios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBlocks();
  }, [slug, date]);

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const start = allDay
        ? new Date(`${date}T00:00:00`)
        : new Date(`${date}T${startTime}:00`);

      const end = allDay
        ? new Date(`${date}T23:59:59`)
        : new Date(`${date}T${endTime}:00`);

      const res = await fetch(`/api/admin/${slug}/blocks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId: professionalId || null,
          title,
          startAtISO: start.toISOString(),
          endAtISO: end.toISOString(),
          allDay,
        }),
      });

      const text = await res.text();
      const json = JSON.parse(text);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao criar bloqueio");
      }

      setSuccessMessage("Bloqueio criado com sucesso.");
      setTitle("");
      setProfessionalId("");
      setAllDay(false);
      setStartTime("09:00");
      setEndTime("18:00");

      await loadBlocks();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao criar bloqueio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBlock(id: string) {
    const confirmed = window.confirm("Deseja excluir este bloqueio?");
    if (!confirmed) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/blocks/${id}`, {
        method: "DELETE",
      });

      const text = await res.text();
      const json = JSON.parse(text);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao excluir bloqueio");
      }

      setSuccessMessage("Bloqueio excluído com sucesso.");
      await loadBlocks();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao excluir bloqueio");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-violet-600">
              Configurações
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900">
              Bloqueios e folgas
            </h1>
            <p className="mt-2 text-zinc-600">
              Crie bloqueios do salão inteiro ou de uma profissional específica.
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Novo bloqueio</h2>

          <form onSubmit={handleCreateBlock} className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Motivo
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Folga, feriado, manutenção, reunião"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Profissional
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="">Salão inteiro</option>
                {data?.professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                Dia inteiro
              </label>
            </div>

            {!allDay && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Início
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Criar bloqueio"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              Bloqueios do dia
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-zinc-600">Carregando...</div>
          ) : !data?.blocks.length ? (
            <div className="p-6 text-zinc-600">
              Nenhum bloqueio nesta data.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {data.blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{block.title}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {block.professional
                        ? `Profissional: ${block.professional.name}`
                        : "Salão inteiro"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {block.allDay
                        ? "Dia inteiro"
                        : `${new Date(block.startAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} - ${new Date(block.endAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}