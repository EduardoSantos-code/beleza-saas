"use client";

import { useEffect, useState } from "react";

type ResponseData = {
  tenant: {
    id: string;
    name: string;
  };
  config: {
    id: string;
    phoneNumberId: string;
    accessToken: string;
    verifyToken: string;
    updatedAt: string;
  } | null;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

export default function WhatsappSettingsClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [testNumber, setTestNumber] = useState("+55");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/whatsapp`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar WhatsApp");
      }

      setData(json);

      if (json.config) {
        setPhoneNumberId(json.config.phoneNumberId || "");
        setAccessToken(json.config.accessToken || "");
        setVerifyToken(json.config.verifyToken || "");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar WhatsApp");
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

      const res = await fetch(`/api/admin/${slug}/whatsapp`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumberId,
          accessToken,
          verifyToken,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar WhatsApp");
      }

      setSuccessMessage("Configuração do WhatsApp salva com sucesso.");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao salvar WhatsApp");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    try {
      setTesting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/whatsapp/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: testNumber,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao enviar teste");
      }

      setSuccessMessage("Mensagem de teste enviada com sucesso.");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao testar WhatsApp");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Integrações
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            WhatsApp
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Configure o envio de confirmações e lembretes para{" "}
            {data?.tenant.name || "o salão"}.
          </p>
        </div>

        <a
          href={`/admin/${slug}`}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
        >
          Voltar para agenda
        </a>
      </div>

      {errorMessage && (
        <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Configuração da Cloud API
        </h2>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone Number ID
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Ex.: 123456789012345"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Este ID vem do número cadastrado na WhatsApp Cloud API.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Access Token
            </label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Token de acesso da Meta"
              rows={4}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Em produção, use token permanente do Business Manager.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Verify Token
            </label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Crie um token qualquer, ex.: studio-bella-webhook"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
          >
            {saving ? "Salvando..." : "Salvar configuração"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Testar envio
        </h2>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="+5511999999999"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-60 transition"
          >
            {testing ? "Enviando..." : "Enviar teste"}
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Use o formato internacional. Ex.: +5511999999999.
        </p>
      </section>
    </div>
  );
}