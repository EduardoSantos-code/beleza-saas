"use client";

import { useEffect, useState } from "react";

const WEEKDAY_LABELS: Record<string, string> = {
  SUNDAY: "Domingo",
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
};

type HourRow = {
  weekday: string;
  isOpen: boolean;
  startMin: number | null;
  endMin: number | null;
  breakStartMin: number | null;
  breakEndMin: number | null;
};

type ProfessionalRow = {
  id: string;
  name: string;
  hours: HourRow[];
};

type ResponseData = {
  tenant: {
    id: string;
    name: string;
  };
  tenantHours: HourRow[];
  professionals: ProfessionalRow[];
};

function minToTime(value: number | null) {
  if (value == null) return "";
  const hh = String(Math.floor(value / 60)).padStart(2, "0");
  const mm = String(value % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMin(value: string) {
  if (!value) return null;
  const [hh, mm] = value.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function updateHourRow(
  rows: HourRow[],
  weekday: string,
  patch: Partial<HourRow>
): HourRow[] {
  return rows.map((row) =>
    row.weekday === weekday ? { ...row, ...patch } : row
  );
}

function HourTable({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: HourRow[];
  onChange: (weekday: string, patch: Partial<HourRow>) => void;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Dia
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Aberto
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Início
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Fim
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Intervalo início
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Intervalo fim
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.weekday}>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-300">
                  {WEEKDAY_LABELS[row.weekday]}
                </td>

                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={row.isOpen}
                    onChange={(e) =>
                      onChange(row.weekday, {
                        isOpen: e.target.checked,
                        startMin: e.target.checked ? row.startMin ?? 540 : null,
                        endMin: e.target.checked ? row.endMin ?? 1080 : null,
                        breakStartMin: e.target.checked ? row.breakStartMin : null,
                        breakEndMin: e.target.checked ? row.breakEndMin : null,
                      })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-violet-600 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={minToTime(row.startMin)}
                    disabled={!row.isOpen}
                    onChange={(e) =>
                      onChange(row.weekday, {
                        startMin: timeToMin(e.target.value),
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm transition-all outline-none bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [color-scheme:light_dark]"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={minToTime(row.endMin)}
                    disabled={!row.isOpen}
                    onChange={(e) =>
                      onChange(row.weekday, {
                        endMin: timeToMin(e.target.value),
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm transition-all outline-none bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [color-scheme:light_dark]"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={minToTime(row.breakStartMin)}
                    disabled={!row.isOpen}
                    onChange={(e) =>
                      onChange(row.weekday, {
                        breakStartMin: timeToMin(e.target.value),
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm transition-all outline-none bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [color-scheme:light_dark]"
                  />
                </td>

                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={minToTime(row.breakEndMin)}
                    disabled={!row.isOpen}
                    onChange={(e) =>
                      onChange(row.weekday, {
                        breakEndMin: timeToMin(e.target.value),
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm transition-all outline-none bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 [color-scheme:light_dark]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HoursSettingsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/hours`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await res.text();
      const json = JSON.parse(text);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar horários");
      }

      setData(json);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar horários");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  async function handleSave() {
    if (!data) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/hours`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantHours: data.tenantHours,
          professionalHours: data.professionals.map((p) => ({
            professionalId: p.id,
            hours: p.hours,
          })),
        }),
      });

      const text = await res.text();
      const json = JSON.parse(text);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar horários");
      }

      setSuccessMessage("Horários salvos com sucesso.");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao salvar horários");
    } finally {
      setSaving(false);
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
            Configurações
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            Horários de atendimento
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Defina o expediente do salão e dos profissionais.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = `/admin/${slug}`}
            className="rounded-xl border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Voltar para agenda
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
          >
            {saving ? "Salvando..." : "Salvar horários"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <HourTable
        title={`Horário do salão — ${data.tenant.name}`}
        rows={data.tenantHours}
        onChange={(weekday, patch) => {
          setData((current) =>
            current
              ? {
                  ...current,
                  tenantHours: updateHourRow(current.tenantHours, weekday, patch),
                }
              : current
          );
        }}
      />

      {data.professionals.map((professional) => (
        <HourTable
          key={professional.id}
          title={`Horário da profissional — ${professional.name}`}
          rows={professional.hours}
          onChange={(weekday, patch) => {
            setData((current) =>
              current
                ? {
                    ...current,
                    professionals: current.professionals.map((p) =>
                      p.id === professional.id
                        ? {
                            ...p,
                            hours: updateHourRow(p.hours, weekday, patch),
                          }
                        : p
                    ),
                  }
                : current
            );
          }}
        />
      ))}
    </div>
  );
}