"use client";

import { useState } from "react";
// Removi 'Scissors' e adicionei ícones de Mail, Lock, ArrowRight, AlertCircle
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("admin@studiobella.com");
  const [password, setPassword] = useState("12345678");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          next: nextPath || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Credenciais inválidas");

      window.location.href = data.redirectTo || "/";
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-4 antialiased relative overflow-hidden">
      
      {/* Detalhe de Fundo (Glow Emerald) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Logo e Cabeçalho */}
        <div className="text-center mb-8 flex flex-col items-center">
          
          {/* --- AJUSTE AQUI: Substituindo a tesoura pela logo do site --- */}
          {/* IMPORTANTE: Garanta que você tenha um arquivo chamado 'logo.png'
              dentro da sua pasta /public. Recomendo que ela seja quadrada ou
              tenha um respiro nas laterais para o object-contain funcionar bem.
          */}
          <img 
            src="/favicon.png" // <--- Mude aqui se o nome do arquivo for diferente
            alt="Logo TratoMarcado"
            // Mantive os estilos de badge, sombra e a leve rotação para dar personalidade
            className="h-20 w-auto min-w-[5rem] max-w-[200px] shrink-0 rounded-2xl bg-white object-contain p-1 mb-4 shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] ring-2 ring-emerald-500/50 rotate-2"
          />

          <h1 className="text-4xl font-black italic tracking-tighter text-white">
            Trato<span className="text-emerald-500">Marcado</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-400">
            Acesse o motor do seu negócio
          </p>
        </div>

        {/* Card de Login */}
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Campo de E-mail */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                E-mail do Administrador
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

            {/* Campo de Senha */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                Senha de Acesso
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-700"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-bold text-red-500 animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* Botão Entrar */}
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
                    Entrar no Painel
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>
        </div>

        {/* Rodapé do Login */}
        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          TratoMarcado &copy; 2026 — Gestão Inteligente
        </p>
      </div>
    </main>
  );
}