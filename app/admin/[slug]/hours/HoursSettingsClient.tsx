"use client";

import { useEffect, useState } from "react";
import { 
  Clock, 
  Calendar, 
  Save, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle,
  Coffee,
  Store
} from "lucide-react";

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
  tenant: { id: string; name: string; };
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

function updateHourRow(rows: HourRow[], weekday: string, patch: Partial<HourRow>): HourRow[] {
  return rows.map((row) => row.weekday === weekday ? { ...row, ...patch } : row);
}

function HourTable({ title, rows, onChange, icon: Icon }: { title: string; rows: HourRow[]; onChange: (weekday: string, patch: Partial<HourRow>) => void; icon: any }) {
  return (
    <section className="rounded-3xl bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none overflow-hidden">
      <div className="border-b border-zinc-100 px-8 py-5 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center gap-3">
        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-zinc-400">Dia</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-zinc-400">Aberto?</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-zinc-400">Início</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-zinc-400">Fim</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-tighter text-zinc-400 flex items-center gap-1"><Coffee className="h-3 w-3"/> Intervalo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {rows.map((row) => (
              <tr key={row.weekday} className={`${row.isOpen ? 'bg-transparent' : 'bg-zinc-50/30 dark:bg-zinc-800/10 opacity-60'}`}>
                <td className="px-6 py-4">
                  <span className={`text-sm font-black ${row.isOpen ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                    {WEEKDAY_LABELS[row.weekday]}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => onChange(row.weekday, { 
                      isOpen: !row.isOpen,
                      startMin: !row.isOpen ? row.startMin ?? 540 : null,
                      endMin: !row.isOpen ? row.endMin ?? 1080 : null,
                    })}
                    className="transition-transform active:scale-90"
                  >
                    {row.isOpen ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                    )}
                  </button>
                </td>

                <td className="px-6 py-4">
                  <input
                    type="time"
                    value={minToTime(row.startMin)}
                    disabled={!row.isOpen}
                    onChange={(e) => onChange(row.weekday, { startMin: timeToMin(e.target.value) })}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 ring-emerald-500 outline-none disabled:opacity-30"
                  />
                </td>

                <td className="px-6 py-4">
                  <input
                    type="time"
                    value={minToTime(row.endMin)}
                    disabled={!row.isOpen}
                    onChange={(e) => onChange(row.weekday, { endMin: timeToMin(e.target.value) })}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 ring-emerald-500 outline-none disabled:opacity-30"
                  />
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={minToTime(row.breakStartMin)}
                      disabled={!row.isOpen}
                      onChange={(e) => onChange(row.weekday, { breakStartMin: timeToMin(e.target.value) })}
                      className="w-24 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none disabled:opacity-20"
                    />
                    <span className="text-zinc-400">às</span>
                    <input
                      type="time"
                      value={minToTime(row.breakEndMin)}
                      disabled={!row.isOpen}
                      onChange={(e) => onChange(row.weekday, { breakEndMin: timeToMin(e.target.value) })}
                      className="w-24 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none disabled:opacity-20"
                    />
                  </div>
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
      const res = await fetch(`/api/admin/${slug}/hours`, { method: "GET", cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar horários");
      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [slug]);

  async function handleSave() {
    if (!data) return;
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      const res = await fetch(`/api/admin/${slug}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantHours: data.tenantHours,
          professionalHours: data.professionals.map((p) => ({ professionalId: p.id, hours: p.hours })),
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setSuccessMessage("Horários atualizados com sucesso!");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 font-bold text-zinc-500 animate-pulse italic">Carregando horários...</div>;
  if (!data) return <div className="p-10 text-red-500 font-bold">{errorMessage}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 pb-20">
      {/* HEADER */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-xs">
            <Calendar className="h-4 w-4" />
            Agenda
          </div>
          <h1 className="mt-2 text-4xl font-black text-zinc-900 dark:text-white italic">Expediente</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 font-medium">Sincronize o horário do salão com a equipe.</p>
        </div>

        <div className="flex gap-3">
          <a
            href={`/admin/${slug}`}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-black text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all uppercase tracking-widest text-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Tudo"}
          </button>
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div className={`p-4 rounded-2xl border font-bold text-sm ${errorMessage ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          {errorMessage || successMessage}
        </div>
      )}

      {/* TABELA DO SALÃO */}
      <HourTable
        title={`Expediente Geral — ${data.tenant.name}`}
        icon={Store}
        rows={data.tenantHours}
        onChange={(weekday, patch) => {
          setData(curr => curr ? { ...curr, tenantHours: updateHourRow(curr.tenantHours, weekday, patch) } : curr);
        }}
      />

      {/* TABELAS DOS PROFISSIONAIS */}
      <div className="space-y-12 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <div className="px-1">
          <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-200">Horários Individuais</h2>
          <p className="text-sm text-zinc-500">Ajuste os turnos específicos de cada profissional.</p>
        </div>
        
        {data.professionals.map((professional) => (
          <HourTable
            key={professional.id}
            title={`Turno de ${professional.name}`}
            icon={Clock}
            rows={professional.hours}
            onChange={(weekday, patch) => {
              setData(curr => curr ? {
                ...curr,
                professionals: curr.professionals.map(p => p.id === professional.id ? { ...p, hours: updateHourRow(p.hours, weekday, patch) } : p)
              } : curr);
            }}
          />
        ))}
      </div>
    </div>
  );
}