"use client";

import { useEffect, useState } from "react";
import { 
  ShieldAlert, 
  Trash2, 
  Clock, 
  ChevronLeft, 
  Plus, 
  Ban,
  CheckCircle2,
  AlertCircle,
  CalendarDays
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

  // Data para filtrar a lista
  const [viewDate, setViewDate] = useState(() => formatLocalDateInput(new Date()));

  // Campos do Formulário
  const [startDate, setStartDate] = useState(() => formatLocalDateInput(new Date()));
  const [endDate, setEndDate] = useState(() => formatLocalDateInput(new Date()));
  const [title, setTitle] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  async function loadBlocks() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/blocks?date=${viewDate}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar");
      setData(json);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBlocks(); }, [slug, viewDate]);

  // Se a data de início mudar e ficar maior que a final, ajusta a final automaticamente
  useEffect(() => {
    if (startDate > endDate) setEndDate(startDate);
  }, [startDate]);

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const start = allDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}:00`);
      const end = allDay ? new Date(`${endDate}T23:59:59`) : new Date(`${endDate}T${endTime}:00`);

      if (end <= start) {
        throw new Error("O horário/data final deve ser maior que o inicial.");
      }

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
      setViewDate(startDate); // Muda a visualização para a data que acabou de ser criada
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

  // Função auxiliar para exibir a data de forma inteligente na lista
  function formatBlockTimeDisplay(startISO: string, endISO: string, isAllDay: boolean) {
    const s = new Date(startISO);
    const e = new Date(endISO);
    
    const isSameDay = s.toDateString() === e.toDateString();

    if (isSameDay) {
      if (isAllDay) return "Dia Inteiro";
      return `${s.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})} às ${e.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}`;
    } else {
      const sDate = s.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const eDate = e.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (isAllDay) return `${sDate} até ${eDate}`;
      return `${sDate} ${s.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})} até ${eDate} ${e.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}`;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 pb-20 relative antialiased">
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

      {/* FORMULÁRIO DE CRIAÇÃO */}
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
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-12 bg-zinc-100 dark:bg-zinc-950 rounded-2xl pl-12 pr-4 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 border-none" placeholder="Ex: Férias, Manutenção, Almoço..." required />
            </div>
          </div>

          {/* DATAS */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Data de Início</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-2 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none cursor-pointer" 
                required 
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Data Final</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                onClick={(e) => e.currentTarget.showPicker()}
                min={startDate} 
                className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-2 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none cursor-pointer" 
                required 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-0 pt-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Profissional</label>
            <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-3 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none">
              <option value="">Salão Inteiro (Todos)</option>
              {data?.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 p-1 pt-2">
            <input type="checkbox" id="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-5 w-5 rounded-lg border-zinc-300 dark:border-zinc-800 text-emerald-500 focus:ring-emerald-500 bg-zinc-100 dark:bg-zinc-950" />
            <label htmlFor="allDay" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer">Bloquear Dia(s) Inteiro(s)</label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Hora Início</label>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-3 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none cursor-pointer" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 truncate">Hora Fim</label>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full h-11 bg-zinc-100 dark:bg-zinc-950 rounded-xl px-3 text-[11px] font-bold text-zinc-900 dark:text-white border-none appearance-none cursor-pointer" 
                  required 
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-4">
            {saving ? "Processando..." : "Confirmar Bloqueio"}
          </button>
        </form>
      </section>

      {/* LISTA DE BLOQUEIOS */}
      <section className="space-y-4 relative z-10 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Bloqueios Ativos para:
          </h3>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="date" 
              value={viewDate} 
              onChange={(e) => setViewDate(e.target.value)} 
              onClick={(e) => e.currentTarget.showPicker()}
              className="pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-white cursor-pointer"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center animate-pulse text-zinc-500 font-bold italic">Buscando bloqueios...</div>
        ) : !data?.blocks.length ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Nenhum bloqueio sobrepondo esta data.</p>
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
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md uppercase">
                        {block.professional ? block.professional.name.split(' ')[0] : "Salão Inteiro"}
                      </span>
                      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBlockTimeDisplay(block.startAt, block.endAt, block.allDay)}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors shrink-0 ml-4"
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