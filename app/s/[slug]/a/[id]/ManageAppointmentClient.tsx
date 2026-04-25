"use client";

import { useEffect, useState, useCallback } from "react";
import { formatBR } from "@/lib/date";
import { CheckCircle2, Calendar, Clock, Scissors, Phone, Printer } from "lucide-react";

export default function ManageAppointmentClient({ slug, id }: { slug: string; id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);

  // 1. Evita erro de Hydration (espera o navegador carregar)
  useEffect(() => { setMounted(true); }, []);

  // 2. Função de carregamento com "Retry" (tenta 3 vezes se não achar)
  const loadAppointment = useCallback(async (retryCount = 0) => {
    try {
      const res = await fetch(`/api/public/${slug}/appointments/${id}`);
      
      if (!res.ok) {
        // Se deu 404 (Não achou), tenta de novo até 3 vezes com um intervalo
        if (res.status === 404 && retryCount < 3) {
          setTimeout(() => loadAppointment(retryCount + 1), 1500);
          return;
        }
        setError(true);
        setLoading(false);
        return;
      }

      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    if (slug && id) loadAppointment();
  }, [slug, id, loadAppointment]);

  // Enquanto carrega ou monta a tela
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Confirmando reserva...</p>
      </div>
    );
  }

  // Se após as tentativas não achar nada
  if (error || !data?.tenant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <p className="text-4xl mb-4">⏳</p>
          <h2 className="text-white font-bold text-xl mb-2">Quase lá...</h2>
          <p className="text-zinc-500 text-sm mb-6">Seu agendamento está sendo processado. Se não aparecer em instantes, verifique seu WhatsApp ou atualize a página.</p>
          <button onClick={() => window.location.reload()} className="bg-violet-600 text-white px-8 py-3 rounded-2xl font-bold text-sm active:scale-95 transition">
            Atualizar Agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        
        {/* Ícone de Sucesso */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Confirmado!</h1>
          <p className="text-zinc-400 mt-2">Sua vaga está garantida na agenda.</p>
        </div>

        {/* Card do Recibo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 space-y-6">
            
            <div className="pb-6 border-b border-zinc-800">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">Local do Atendimento</p>
              <h2 className="text-2xl font-black">{data.tenant.name}</h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Data</p>
                  <p className="font-bold">{formatBR(data.startAt, "dd 'de' MMMM")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Clock className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Horário</p>
                  <p className="font-bold">{formatBR(data.startAt, "HH:mm")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Scissors className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Serviço</p>
                  <p className="font-bold">{data.service.name} <span className="text-zinc-500 font-normal">com</span> {data.professional.name}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Total</p>
                <p className="text-2xl font-black text-white">R$ {(data.service.priceCents / 100).toFixed(2).replace('.', ',')}</p>
              </div>
              <span className="text-[10px] bg-zinc-800 px-3 py-1 rounded-lg font-bold text-zinc-400 uppercase">No Local</span>
            </div>
          </div>

          <div className="bg-zinc-800/30 p-4 flex gap-2">
            <button 
              onClick={() => window.print()}
              className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <a 
              href={`/s/${slug}`}
              className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest border border-zinc-700 hover:bg-zinc-700 transition text-center flex items-center justify-center"
            >
              Novo Agendamento
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}