"use client";

import { useMemo, useState } from "react";

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
        headers: {
          "Content-Type": "application/json",
        },
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

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Resposta inválida da API: ${text}`);
      }

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao criar conta");
      }

      window.location.href = json.redirectTo || "/";
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <p className="text-sm font-medium uppercase tracking-wide text-violet-600">
          Começar teste grátis
        </p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">
          Criar conta do salão
        </h1>
        <p className="mt-2 text-zinc-600">
          Seu salão será criado com trial de 14 dias e acesso imediato ao painel.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Nome do salão
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Ex.: Studio Bella"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Slug da URL
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder={suggestedSlug || "ex.: studio-bella"}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              required
            />
            <p className="mt-1 text-xs text-zinc-500">
              Sua página ficará assim: /s/{slug || suggestedSlug || "seu-slug"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Nome do responsável
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
              required
              minLength={8}
            />
          </div>

          {errorMessage && (
            <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "Criando conta..." : "Criar conta e entrar"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-zinc-500">
          Já tem conta? <a href="/login" className="text-violet-600 hover:underline">Entrar</a>
        </p>
      </div>
    </main>
  );
}