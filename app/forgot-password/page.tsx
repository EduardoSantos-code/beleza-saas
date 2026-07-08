// app/forgot-password/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao solicitar recuperação");

      setSuccessMessage(data.message || "Link de recuperação enviado com sucesso!");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-4 antialiased relative overflow-hidden">
      
      {/* Glow de Fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/login" className="group flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-6">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Voltar ao Login
          </Link>

          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            Trato<span className="text-emerald-500">Marcado</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-400">
            Recuperação de Acesso
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl">
          {successMessage ? (
            <div className="space-y-6 text-center py-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">E-mail Enviado!</h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {successMessage}
                </p>
              </div>
              
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full h-12 border border-zinc-800 hover:border-zinc-700 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] text-white hover:bg-zinc-800/20 transition-all active:scale-95"
              >
                Voltar para a Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                Digite o e-mail cadastrado na plataforma. Se ele estiver correto, enviaremos um link seguro para você redefinir sua senha na mesma hora.
              </p>

              {/* E-mail */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                  E-mail de Trabalho
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-700"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Erro */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-bold text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Botão Enviar */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-14 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] text-zinc-950 transition-all shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] active:scale-95 disabled:scale-100 overflow-hidden"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Solicitar Redefinição
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>
          )}
        </div>

        {/* Rodapé */}
        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          TratoMarcado &copy; 2026 — Gestão Inteligente
        </p>
      </div>
    </main>
  );
}
