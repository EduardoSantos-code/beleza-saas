"use client";

import { useEffect, useState } from "react";

export default function BrandingClient({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [address, setAddress] = useState("");
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch(`/api/admin/${slug}/branding`);
        const data = await res.json();
        if (res.ok) {
          setName(data.name || "");
          setPrimaryColor(data.primaryColor || "#7c3aed");
          setLogoUrl(data.logoUrl || "");
          setHeroImageUrl(data.heroImageUrl || "");
          setPublicDescription(data.publicDescription || "");
          setPublicPhone(data.publicPhone || "");
          setInstagram(data.instagram || "");
          setAddress(data.address || "");
          setMinAdvanceHours(data.minAdvanceHours ?? 2);
        }
      } catch (err) {
        console.error("Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBranding();
  }, [slug]);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`/api/admin/${slug}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, primaryColor, logoUrl, heroImageUrl, publicDescription,
          publicPhone, instagram, address, minAdvanceHours: Number(minAdvanceHours),
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar configurações");

      setMessage("Configurações salvas com sucesso!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-zinc-500 dark:text-zinc-400">Carregando configurações...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Branding</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Personalize a identidade visual da sua página pública.</p>
      </div>

      {message && (
        <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-900">
          {message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Dados da Página</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Público</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Descrição</label>
              <textarea value={publicDescription} onChange={(e) => setPublicDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cor Principal</label>
                <div className="flex gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded border-none bg-transparent p-0" />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Antecedência (Horas)</label>
                <input type="number" min="0" value={minAdvanceHours} onChange={(e) => setMinAdvanceHours(Number(e.target.value))} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">WhatsApp (E.164)</label>
              <input type="text" value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} placeholder="+55..." className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Instagram</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuinsta" className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">URL da Logo</label>
              <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">URL do Banner</label>
              <input type="text" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
            </div>

            <button onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white transition hover:bg-violet-700 disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        <div className="sticky top-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Prévia do Banner</h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="h-48 w-full bg-cover bg-center" style={{ backgroundImage: heroImageUrl ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${heroImageUrl}')` : `linear-gradient(135deg, ${primaryColor}, #111827)` }} />
            <div className="relative -mt-10 px-6 pb-6">
              <div className="flex items-end gap-4">
                {logoUrl ? <img src={logoUrl} className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md dark:border-zinc-900" /> : <div className="h-20 w-20 rounded-2xl border-4 border-white bg-zinc-200 dark:border-zinc-900 dark:bg-zinc-800" />}
                <div className="pb-1">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{name || "Seu Salão"}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{minAdvanceHours}h de antecedência mínima</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}