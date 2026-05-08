"use client";

import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  ChevronLeft, 
  Plus, 
  Ban,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

type Professional = { id: string; name: string; };
type BlockItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  professional: Professional | null;
};

type ResponseData = {
  tenant: { id: string; name: string; };
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
      const res = await fetch(`/api/admin/${slug}/blocks?date=${date}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar");
      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBlocks(); }, [slug, date]);

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const start = allDay ? new Date(`${date}T00:00:00`) : new Date(`${date}T${startTime}:00`);
      const end = allDay ? new Date(`${date}T23:59:59`) : new Date(`${date}T${endTime}:00`);

      const res = await fetch(`/api/admin/${slug}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: professionalId || null,
          title,
          startAtISO: start.toISOString(),
          endAtISO: end.toISOString(),
          allDay,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar bloqueio");

      setSuccessMessage("Bloqueio criado com sucesso.");
      setTitle("");
      setProfessionalId("");
      setAllDay(false);
      await loadBlocks();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBlock(id: string) {
    if (!window.confirm("Deseja excluir este bloqueio?")) return;
    try {
      const res = await fetch(`/api/admin/${slug}/blocks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      setSuccessMessage("Bloqueio removido.");
      await loadBlocks();
    } catch (err: any) { setErrorMessage(err.message); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-20 relative antialiased">
      {/* Detalhe de Fundo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-[10px]">
            <Ban className="h-4 w-4" /> Gestão de Horários
          </div>
          <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter">
            Bloqueios e <span className="text-emerald-500">Folgas</span>
          </h1>
        </div>

        <Link 
          href={`/admin/${slug}`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 transition-all shadow-sm"
        >
          <ChevronLeft size={16} /> Voltar Agenda
        </Link>
      </div>

      {/* MENSAGENS */}
      {(errorMessage || successMessage) && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${
          errorMessage ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/10 dark:border-red-900/30" : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-900/30"
        }`}>
          {errorMessage ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <p className="text-xs font-bold uppercase tracking-tight">{errorMessage || successMessage}</p>
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO (GRID CORRIGIDA PARA IPHONE) */}
      <section className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Plus className="h-6 w-6 text-zinc-950" />
          </div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">Criar Novo Bloqueio</h2>
        </div>

        <form onSubmit={handleCreateBlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Motivo / Título</label>
            <div className="relative group">
              <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-12 bg-zinc-100 dark:bg-zinc-950 rounded-2xl pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 border-none" placeholder="Ex: Manutenção, Almoço..." required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5 min-w-0">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 block truncate">Data</label>
              <input type="date" value={date} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setDate(e.target.value)} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-2.5 text-[11px] font-bold text-zinc-900 dark:text-white border-none" required />
            </div>
            <div className="space-y-1.5 min-w-0">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 block truncate">Profissional</label>
              <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-2.5 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none">
                <option value="">Salão Inteiro</option>
                {data?.professionals.map(p => <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-1">
            <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-5 w-5 rounded-lg border-zinc-300 dark:border-zinc-800 text-emerald-500 focus:ring-emerald-500 bg-zinc-100 dark:bg-zinc-950" />
            <label htmlFor="allDay" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer">Bloquear Dia Inteiro</label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 block truncate">Início</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-4 text-[11px] font-bold text-zinc-900 dark:text-white border-none" required />
              </div>
              <div className="space-y-1.5 min-w-0">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 block truncate">Fim</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-4 text-[11px] font-bold text-zinc-900 dark:text-white border-none" required />
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-2">
            {saving ? "Processando..." : "Confirmar Bloqueio"}
          </button>
        </form>
      </section>

      {/* LISTA DE BLOQUEIOS DO DIA */}
      <section className="space-y-4 relative z-10">
        <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-2">Bloqueios Ativos para esta Data</h3>
        
        {loading ? (
          <div className="p-8 text-center animate-pulse text-zinc-500 font-bold italic">Buscando bloqueios...</div>
        ) : !data?.blocks.length ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Nenhum bloqueio encontrado</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.blocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center text-zinc-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-zinc-900 dark:text-white uppercase leading-none">{block.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md uppercase">
                        {block.professional ? block.professional.name.split(' ')[0] : "Todos"}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600">
                        {block.allDay ? "Dia Inteiro" : `${new Date(block.startAt).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})} - ${new Date(block.endAt).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}`}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}