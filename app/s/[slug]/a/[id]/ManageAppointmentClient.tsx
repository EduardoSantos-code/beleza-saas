"use client";

import { useEffect, useState } from "react";
import { formatBR } from "@/lib/date"; // Usando a nossa nova ferramenta de fuso

type AppointmentData = {
  id: string;
  startAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED";
  service: { name: string; priceCents: number; durationMin: number };
  professional: { name: string };
  tenant: { name: string; primaryColor: string | null; logoUrl: string | null };
};

export default function ManageAppointmentClient({ slug, id }: { slug: string; id: string }) {
  const [data, setData] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      const res = await fetch(`/api/public/${slug}/appointments/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar dados.");
      setData(json.appointment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug, id]);

  async function handleCancel() {
    const confirm = window.confirm("Tem certeza que deseja cancelar este agendamento?");
    if (!confirm) return;

    try {
      setCanceling(true);
      const res = await fetch(`/api/public/${slug}/appointments/${id}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao cancelar.");
      await loadData(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCanceling(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-zinc-500">Carregando...</div>;
  if (error || !data) return <div className="p-10 text-center text-red-500">{error || "Não encontrado"}</div>;

  const primaryColor = data.tenant.primaryColor || "#7c3aed";
  const isCanceled = data.status === "CANCELED";
  
  // Comparação de data para saber se o horário já passou
  const isPast = new Date(data.startAt) < new Date();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="p-8 text-center" style={{ backgroundColor: primaryColor }}>
          {data.tenant.logoUrl && (
            <img src={data.tenant.logoUrl} alt="Logo" className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-md" />
          )}
          <h1 className="text-2xl font-bold text-white">{data.tenant.name}</h1>
          <p className="text-white/80">Detalhes do Agendamento</p>
        </div>

        <div className="p-8">
          {isCanceled && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-center font-medium text-red-700">
              Agendamento Cancelado
            </div>
          )}
          {data.status === "COMPLETED" && (
            <div className="mb-6 rounded-xl bg-green-50 p-4 text-center font-medium text-green-700">
              Atendimento Concluído
            </div>
          )}

          <div className="space-y-4 text-zinc-700">
            <div className="flex justify-between border-b border-zinc-100 pb-4">
              <span className="text-zinc-500">Serviço</span>
              <span className="font-medium text-zinc-900">{data.service.name}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-4">
              <span className="text-zinc-500">Profissional</span>
              <span className="font-medium text-zinc-900">{data.professional.name}</span>
            </div>
            
            <div className="flex justify-between border-b border-zinc-100 pb-4">
              <span className="text-zinc-500">Data e Hora</span>
              <span className="font-medium text-zinc-900">
                {/* AQUI ESTÁ A MUDANÇA: 
                   Usamos formatBR para garantir dd/MM/yyyy às HH:mm em Brasília
                */}
                {formatBR(data.startAt, "dd/MM/yyyy 'às' HH:mm")}
              </span>
            </div>

            <div className="flex justify-between pb-2">
              <span className="text-zinc-500">Valor</span>
              <span className="font-medium text-zinc-900">R$ {(data.service.priceCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {!isCanceled && !isPast && data.status !== "COMPLETED" && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="mt-8 w-full rounded-xl border border-red-200 bg-red-50 py-3 font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              {canceling ? "Cancelando..." : "Cancelar Agendamento"}
            </button>
          )}

          <div className="mt-6 text-center">
            <a href={`/s/${slug}`} className="text-sm font-medium text-violet-600 hover:underline">
              Fazer novo agendamento
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}