"use client";

import { useEffect, useState, useCallback } from "react";
import { formatBR } from "@/lib/date";
import { CheckCircle2, Calendar, Clock, Scissors, Printer, XCircle, RefreshCcw, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ManageAppointmentClient({ slug, id }: { slug: string; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadAppointment = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${slug}/appointments/${id}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.appointment);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    if (slug && id) loadAppointment();
  }, [slug, id, loadAppointment]);

  const handleCancel = async () => {
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/public/${slug}/appointments/${id}`, { method: "PATCH" });
      if (res.ok) {
        await loadAppointment(); // Atualiza a tela após cancelar
        alert("Agendamento cancelado.");
      }
    } catch (err) {
      alert("Erro ao cancelar.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Carregando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <p className="text-4xl mb-4">⏳</p>
          <h2 className="text-white font-bold text-xl mb-2">Quase lá...</h2>
          <p className="text-zinc-500 text-sm mb-6">Não conseguimos localizar seu agendamento. Verifique o link ou atualize a página.</p>
          <button onClick={() => window.location.reload()} className="bg-violet-600 text-white px-8 py-3 rounded-2xl font-bold text-sm">Atualizar</button>
        </div>
      </div>
    );
  }

  const isCanceled = data.status === "CANCELED";

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center antialiased">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-20 h-20 ${isCanceled ? 'bg-red-500/10' : 'bg-green-500/10'} rounded-full flex items-center justify-center mb-4 border ${isCanceled ? 'border-red-500/20' : 'border-green-500/20'}`}>
            {isCanceled ? <AlertCircle className="w-10 h-10 text-red-500" /> : <CheckCircle2 className="w-10 h-10 text-green-500" />}
          </div>
          <h1 className={`text-3xl font-black italic uppercase tracking-tighter ${isCanceled ? 'text-red-500' : 'text-white'}`}>
            {isCanceled ? 'Cancelado' : 'Confirmado!'}
          </h1>
        </div>

        <div className={`bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl ${isCanceled ? 'opacity-50' : ''}`}>
          <div className="p-8 space-y-6">
            <div className="pb-6 border-b border-zinc-800">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">Local</p>
              <h2 className="text-2xl font-black">{data.tenant?.name}</h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Data</p>
                  <p className="font-bold" suppressHydrationWarning>{formatBR(data.startAt, "dd 'de' MMMM")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Clock className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Horário</p>
                  <p className="font-bold" suppressHydrationWarning>{formatBR(data.startAt, "HH:mm")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Scissors className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Serviço</p>
                  <p className="font-bold">{data.service?.name}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
              <p className="text-2xl font-black italic">R$ {((data.service?.priceCents || 0) / 100).toFixed(2).replace('.', ',')}</p>
              <span className="text-[10px] bg-zinc-800 px-3 py-1 rounded-lg font-bold text-zinc-400 uppercase">No Local</span>
            </div>
          </div>

          <div className="p-4 bg-zinc-800/30 flex flex-col gap-2">
            {!isCanceled && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => router.push(`/s/${slug}`)} className="py-4 bg-zinc-800 text-white rounded-2xl font-bold text-[10px] tracking-widest border border-zinc-700 flex items-center justify-center gap-2">
                  <RefreshCcw className="w-4 h-4" /> Reagendar
                </button>
                <button onClick={handleCancel} disabled={isCancelling} className="py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold text-[10px] tracking-widest border border-red-500/20 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> {isCancelling ? "..." : "Cancelar"}
                </button>
              </div>
            )}
            <button onClick={() => isCanceled ? router.push(`/s/${slug}`) : window.print()} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest">
              {isCanceled ? "Agendar Novo Horário" : "Imprimir Comprovante"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}