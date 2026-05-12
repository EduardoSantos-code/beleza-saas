"use client";

import { useEffect, useState, useCallback } from "react";
import { formatBR } from "@/lib/date";
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Scissors, 
  Printer, 
  XCircle, 
  RefreshCcw, 
  AlertCircle,
  MapPin,
  User,
  Crown,
  BadgePercent
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale'

type AppointmentData = {
  id: string;
  startAt: string;
  status: string;
  tenant: { name: string; primaryColor?: string };
  service: { name: string; price: number };
  professional: { name: string };
  clubSubscriptionId?: string | null;
  clubPlanName?: string | null;
  clubOriginalPrice?: number | null;
  clubDiscountAmount?: number | null;
  clubFinalPrice?: number | null;
};

function formatCurrencyFromCents(valueInCents: number | null | undefined) {
  const value = typeof valueInCents === "number" ? valueInCents : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export default function ManageAppointmentClient({ slug, id }: { slug: string; id: string }) {
  const router = useRouter();
  const [data, setData] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const TZ = 'America/Sao_Paulo';
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
    if (!confirm("Tem certeza que deseja cancelar este horário? O barbeiro será avisado.")) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id })
      });
      if (res.ok) {
        await loadAppointment(); 
        alert("Agendamento cancelado com sucesso.");
      }
    } catch (err) {
      alert("Erro ao cancelar o agendamento. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Buscando ticket...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertCircle className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-white font-black text-xl mb-2">Putz, não achamos!</h2>
          <p className="text-zinc-400 text-xs mb-6 font-medium">Este agendamento não existe ou o link pode estar quebrado.</p>
          <button onClick={() => window.location.reload()} className="w-full bg-white text-zinc-950 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition-colors">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const isCanceled = data.status === "CANCELED";
  const primaryColor = data.tenant?.primaryColor || "#10b981";

  return (
    <div 
      className="min-h-[100dvh] p-4 flex flex-col items-center justify-center antialiased relative overflow-hidden"
      style={{
        background: isCanceled 
          ? '#09090b' 
          : `radial-gradient(circle at top, ${primaryColor}30 0%, #09090b 50%)`
      }}
    >
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 z-10 flex flex-col h-full justify-center">
        
        {/* HEADER DO TICKET COMPACTO */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl ${
            isCanceled ? 'bg-red-500/10 border border-red-500/20' : 'bg-white shadow-emerald-500/20'
          }`}>
            {isCanceled ? (
              <XCircle className="w-8 h-8 text-red-500" />
            ) : (
              <CheckCircle2 className="w-8 h-8" style={{ color: primaryColor }} />
            )}
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Status do Horário</p>
          <h1 className={`text-3xl font-black italic tracking-tighter ${isCanceled ? 'text-red-500' : 'text-white'}`}>
            {isCanceled ? 'Cancelado' : 'Confirmado'}
          </h1>
        </div>

        {/* CORPO DO TICKET COMPACTO */}
        <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative ${isCanceled ? 'opacity-50 grayscale' : ''}`}>
          
          {/* Recortes laterais ajustados */}
          <div className="absolute left-0 top-[85px] -translate-y-1/2 w-3 h-6 bg-zinc-950 rounded-r-full border-r border-y border-zinc-800 z-10" style={{ background: isCanceled ? '#09090b' : 'transparent' }}></div>
          <div className="absolute right-0 top-[85px] -translate-y-1/2 w-3 h-6 bg-zinc-950 rounded-l-full border-l border-y border-zinc-800 z-10" style={{ background: isCanceled ? '#09090b' : 'transparent' }}></div>

          <div className="p-6 pb-6 space-y-5 relative">
            
            <div className="pb-5 border-b border-dashed border-zinc-700 flex justify-between items-center">
              <h2 className="text-xl font-black text-white truncate max-w-[70%]">{data.tenant?.name}</h2>
              <p className="text-[9px] font-bold text-zinc-500 flex items-center gap-1 uppercase tracking-widest">
                <MapPin size={10} /> Presencial
              </p>
            </div>

            {/* GRID 2x2 PARA ECONOMIZAR ESPAÇO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Data</p>
                </div>
                <p className="font-bold text-sm text-white" suppressHydrationWarning>
                  {formatInTimeZone(new Date(data.startAt), TZ, "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>

              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Horário</p>
                </div>
                <p className="font-bold text-sm text-white" suppressHydrationWarning>
                  {formatInTimeZone(new Date(data.startAt), TZ, "HH:mm")}
                </p>
              </div>

              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Scissors className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Serviço</p>
                </div>
                <p className="font-bold text-sm text-white truncate">{data.service?.name}</p>
              </div>

              <div className="bg-zinc-800/50 p-3 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <User className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Profissional</p>
                </div>
                <p className="font-bold text-sm text-white truncate">{data.professional?.name}</p>
              </div>
            </div>

            {/* BENEFÍCIO DO CLUBE */}
            {data.clubSubscriptionId && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Benefício do clube aplicado</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase">Plano</p>
                    <p className="text-xs font-bold text-white">{data.clubPlanName}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase">Desconto</p>
                    <p className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                      <BadgePercent size={10} /> -{formatCurrencyFromCents(data.clubDiscountAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between items-end">
              <div>
                 <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Total a pagar</p>
                 <p className="text-2xl font-black italic text-white leading-none">
                   {formatCurrencyFromCents(data.clubSubscriptionId ? data.clubFinalPrice : data.service?.price)}
                 </p>
              </div>
              <span className="text-[9px] bg-white text-zinc-900 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-widest">No Local</span>
            </div>
          </div>

          {/* RODAPÉ E BOTÕES DE AÇÃO COMPACTOS */}
          <div className="p-4 bg-zinc-950 flex flex-col gap-2">
            {!isCanceled && (
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => router.push(`/s/${slug}`)} 
                  className="py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest border border-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Novo
                </button>
                <button 
                  onClick={handleCancel} 
                  disabled={isCancelling} 
                  className="py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-red-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> {isCancelling ? "..." : "Cancelar"}
                </button>
              </div>
            )}
            
            <button 
              onClick={() => isCanceled ? router.push(`/s/${slug}`) : window.print()} 
              className="w-full py-3.5 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg mt-1"
              style={{ backgroundColor: isCanceled ? '#18181b' : primaryColor }}
            >
              {isCanceled ? (
                "Verificar Nova Data"
              ) : (
                <><Printer className="w-4 h-4" /> Imprimir / Salvar</>
              )}
            </button>
          </div>
        </div>
        
        {!isCanceled && (
          <p className="text-center mt-4 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
            Um print desta tela serve como comprovante.
          </p>
        )}
      </div>
    </div>
  );
}