"use client";

import { useState } from "react";

type OnboardingProps = {
  slug: string;
  hasServices: boolean;
  hasProfessionals: boolean;
  onComplete: () => void;
};

// Templates Prontos para o Botão Mágico
const BARBERSHOP_TEMPLATES = [
  { name: "Corte Clássico", durationMin: 30, priceCents: 4500, active: true },
  { name: "Barba Terapia", durationMin: 30, priceCents: 3500, active: true },
  { name: "Combo: Corte + Barba", durationMin: 60, priceCents: 7500, active: true },
  { name: "Acabamento / Pezinho", durationMin: 15, priceCents: 2000, active: true },
  { name: "Sobrancelha Masculina", durationMin: 15, priceCents: 1500, active: true },
];

export default function OnboardingFlow({ slug, hasServices, hasProfessionals, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"WELCOME" | "SERVICE" | "PROFESSIONAL">("WELCOME");
  
  // Estados para Criação Manual
  const [name, setName] = useState("");
  const [price, setPrice] = useState("50.00");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [error, setError] = useState("");

  function brlToCents(value: string) {
    const normalized = value.replace(",", ".").trim();
    return Math.round(Number(normalized) * 100);
  }

  // Função para criar UM serviço manualmente
  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/${slug}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          durationMin: Number(duration),
          priceCents: brlToCents(price),
          active: true,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar serviço");
      
      setName(""); 
      if (!hasProfessionals) {
        setStep("PROFESSIONAL");
      } else {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Função para criar a lista de serviços magicamente
  async function handleBulkCreateBarbershop() {
    setLoadingBulk(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/${slug}/services/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(BARBERSHOP_TEMPLATES),
      });

      if (!res.ok) throw new Error("Erro ao importar serviços");
      
      if (!hasProfessionals) {
        setStep("PROFESSIONAL");
      } else {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingBulk(false);
    }
  }

  // Função para criar o primeiro Profissional
  async function handleCreateProfessional(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, active: true }),
      });

      if (!res.ok) throw new Error("Erro ao criar profissional");
      onComplete(); // Terminou o fluxo
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const startFlow = () => {
    if (!hasServices) setStep("SERVICE");
    else if (!hasProfessionals) setStep("PROFESSIONAL");
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
        
        {step === "WELCOME" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl dark:bg-violet-900/30">
              👋
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Bem-vindo(a)!</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Para começar a receber agendamentos, precisamos configurar pelo menos um serviço e um profissional.
            </p>
            <button
              onClick={startFlow}
              className="mt-8 w-full rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 transition"
            >
              Vamos começar
            </button>
          </div>
        )}

        {step === "SERVICE" && (
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Passo 1: Seus Serviços</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Você pode importar os serviços padrão de barbearia ou criar o seu primeiro manualmente.
            </p>

            {/* BOTÃO MÁGICO AQUI */}
            <button
              onClick={handleBulkCreateBarbershop}
              disabled={loadingBulk || loading}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-4 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
            >
              ✨ {loadingBulk ? "Importando..." : "Importar serviços de Barbearia"}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-700"></div>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Ou crie manual</span>
              <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-700"></div>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Serviço</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Preço (R$)</label>
                  <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Duração (min)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" required />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button disabled={loading || loadingBulk} type="submit" className="mt-4 w-full rounded-xl border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition">
                {loading ? "Salvando..." : "Salvar manualmente"}
              </button>
            </form>
          </div>
        )}

        {step === "PROFESSIONAL" && (
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Passo 2: Quem realiza?</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Adicione o nome do primeiro barbeiro/profissional (pode ser o seu nome).
            </p>

            <form onSubmit={handleCreateProfessional} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Profissional</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" required />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button disabled={loading} type="submit" className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition">
                {loading ? "Finalizando..." : "Concluir configuração"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}