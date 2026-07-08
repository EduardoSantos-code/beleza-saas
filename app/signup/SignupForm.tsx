"use client";

import { useMemo, useState } from "react";
import { 
  Store, 
  User, 
  Mail, 
  Lock, 
  Link as LinkIcon, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from "lucide-react";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SignupForm() {
  const [tenantName, setTenantName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const suggestedSlug = useMemo(() => slugify(tenantName), [tenantName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          slug: slug || suggestedSlug,
          ownerName,
          email,
          password,
        }),
      });

      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { throw new Error(`Erro: ${text}`); }

      if (!res.ok) throw new Error(json?.error || "Erro ao criar conta");

      window.location.href = json.redirectTo || "/";
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-4 antialiased relative overflow-hidden py-12">
      
      {/* Detalhe de Fundo (Glow Emerald) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Cabeçalho */}
        <div className="text-center mb-10 flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="Logo TratoMarcado"
            className="h-16 w-auto mb-6 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/30 rounded-xl rotate-2"
          />
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4">
            <Sparkles className="h-3 w-3" /> Teste Grátis de 30 dias
          </span>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-tight">
            Crie sua <span className="text-emerald-500">Unidade</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-400">
            Configure seu salão e comece a agendar hoje mesmo
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-10 shadow-2xl">
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            
            {/* Nome do Salão */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                Nome Comercial do Salão
              </label>
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-700"
                  placeholder="Ex: Barber Shop Premium"
                  required
                />
              </div>
            </div>

            {/* Slug/URL */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Endereço da sua Página</label>
                <span className="text-[9px] text-emerald-500/60 font-bold tracking-tight">tratomarcado.tech/s/<b>{slug || suggestedSlug || "link"}</b></span>
              </div>
              <div className="relative group">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-700"
                  placeholder={suggestedSlug || "seu-link"}
                  required
                />
              </div>
            </div>

            {/* Nome do Responsável */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Seu Nome</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="Nome do dono"
                  required
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">E-mail de Acesso</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Criar Senha Forte</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Erro */}
            {errorMessage && (
              <div className="md:col-span-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-bold text-red-500 animate-in fade-in zoom-in-95">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* Botão Final */}
            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-14 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] text-zinc-950 transition-all shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] active:scale-95"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Criar minha conta agora
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs font-medium text-zinc-500">
            Já é parceiro? <a href="/login" className="text-emerald-500 hover:text-emerald-400 font-black uppercase tracking-widest text-[10px] ml-1 transition-colors">Entrar no Painel</a>
          </p>
        </div>

        <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-700">
          TratoMarcado &copy; 2026 — Plataforma de Agendamento Profissional
        </p>
      </div>
    </main>
  );
}