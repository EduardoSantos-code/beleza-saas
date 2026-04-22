"use client";

import { useEffect, useState } from "react";

type TenantBranding = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string | null;
  publicDescription: string | null;
  publicPhone: string | null;
  address: string | null;
  instagram: string | null;
};

type ResponseData = {
  tenant: TenantBranding;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

export default function BrandingClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [publicDescription, setPublicDescription] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/branding`, {
        method: "GET",
        cache: "no-store",
      });

      const json: ResponseData = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error((json as any)?.error || "Erro ao carregar branding");
      }

      setName(json.tenant.name || "");
      setPrimaryColor(json.tenant.primaryColor || "#7c3aed");
      setPublicDescription(json.tenant.publicDescription || "");
      setPublicPhone(json.tenant.publicPhone || "");
      setAddress(json.tenant.address || "");
      setInstagram(json.tenant.instagram || "");
      setLogoUrl(json.tenant.logoUrl || "");
      setHeroImageUrl(json.tenant.heroImageUrl || "");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar branding");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          primaryColor,
          publicDescription,
          publicPhone,
          address,
          instagram,
          logoUrl,
          heroImageUrl,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar branding");
      }

      setSuccessMessage("Branding salvo com sucesso.");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao salvar branding");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    file: File,
    type: "logo" | "hero"
  ) {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      if (type === "logo") setUploadingLogo(true);
      if (type === "hero") setUploadingHero(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch(`/api/admin/${slug}/branding/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao enviar imagem");
      }

      if (type === "logo") {
        setLogoUrl(json.url);
      } else {
        setHeroImageUrl(json.url);
      }

      setSuccessMessage(
        type === "logo"
          ? "Logo enviada com sucesso."
          : "Banner enviado com sucesso."
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao enviar imagem");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      if (type === "hero") setUploadingHero(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-violet-600">
              Personalização
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900">Branding</h1>
            <p className="mt-2 text-zinc-600">
              Personalize a aparência pública do salão.
            </p>
          </div>

          <a
            href={`/admin/${slug}`}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Voltar para agenda
          </a>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <p className="text-zinc-600">Carregando...</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">Imagens</h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-800">Logo</p>

                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="mt-4 h-28 w-28 rounded-2xl object-cover ring-1 ring-zinc-200"
                    />
                  ) : (
                    <div className="mt-4 flex h-28 w-28 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                      Sem logo
                    </div>
                  )}

                  <div className="mt-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, "logo");
                      }}
                      className="block w-full text-sm text-zinc-600"
                    />
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    PNG ou JPG, até 5MB.
                  </p>

                  {uploadingLogo && (
                    <p className="mt-2 text-sm text-zinc-500">Enviando logo...</p>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-800">Banner</p>

                  {heroImageUrl ? (
                    <img
                      src={heroImageUrl}
                      alt="Banner"
                      className="mt-4 h-28 w-full rounded-2xl object-cover ring-1 ring-zinc-200"
                    />
                  ) : (
                    <div className="mt-4 flex h-28 w-full items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                      Sem banner
                    </div>
                  )}

                  <div className="mt-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, "hero");
                      }}
                      className="block w-full text-sm text-zinc-600"
                    />
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    PNG ou JPG, até 5MB.
                  </p>

                  {uploadingHero && (
                    <p className="mt-2 text-sm text-zinc-500">Enviando banner...</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">Dados públicos</h2>

              <form onSubmit={handleSave} className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Nome público
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Cor principal
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-12 w-16 rounded-lg border border-zinc-300 bg-white"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Descrição pública
                  </label>
                  <textarea
                    value={publicDescription}
                    onChange={(e) => setPublicDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Telefone público
                  </label>
                  <input
                    type="text"
                    value={publicPhone}
                    onChange={(e) => setPublicPhone(e.target.value)}
                    placeholder="+5511999999999"
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@studiobella"
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                      Opções avançadas: editar URLs manualmente
                    </summary>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700">
                          URL da logo
                        </label>
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-700">
                          URL do banner
                        </label>
                        <input
                          type="url"
                          value={heroImageUrl}
                          onChange={(e) => setHeroImageUrl(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </details>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl px-5 py-3 font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {saving ? "Salvando..." : "Salvar branding"}
                  </button>
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
              <div className="border-b border-zinc-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-zinc-900">Prévia</h2>
              </div>

              <div className="p-6">
                <div className="overflow-hidden rounded-2xl border border-zinc-200">
                  <div
                    className="h-48 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: heroImageUrl
                        ? `linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.45)), url(${heroImageUrl})`
                        : `linear-gradient(135deg, ${primaryColor}, #111827)`,
                    }}
                  />
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="h-16 w-16 rounded-2xl object-cover ring-1 ring-zinc-200"
                        />
                      ) : (
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {name?.slice(0, 1).toUpperCase() || "S"}
                        </div>
                      )}

                      <div>
                        <h3 className="text-2xl font-bold text-zinc-900">{name}</h3>
                        <p className="text-zinc-600">
                          {publicDescription || "Descrição do salão"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {publicPhone && (
                        <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                          <span className="font-medium">Telefone:</span> {publicPhone}
                        </div>
                      )}

                      {instagram && (
                        <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                          <span className="font-medium">Instagram:</span> {instagram}
                        </div>
                      )}

                      {address && (
                        <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
                          <span className="font-medium">Endereço:</span> {address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}