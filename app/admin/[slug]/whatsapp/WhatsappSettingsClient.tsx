"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  slug: string;
};

type WhatsAppConfigResponse = {
  tenant?: {
    id: string;
    name: string;
  };
  config: null | {
    id: string;
    provider: string;
    instanceName: string;
    status: string;
    connectedPhone?: string | null;
    profileName?: string | null;
    qrCodeBase64?: string | null;
    qrCodeText?: string | null;
    pairingCode?: string | null;
    updatedAt?: string;
    lastConnectionAt?: string | null;
  };
  error?: string;
};

function toImageSrc(base64?: string | null) {
  if (!base64) return null;
  if (base64.startsWith("data:image")) return base64;
  return `data:image/png;base64,${base64}`;
}

export default function WhatsappSettingsClient({ slug }: Props) {
  const [data, setData] = useState<WhatsAppConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const qrImageSrc = useMemo(
    () => toImageSrc(data?.config?.qrCodeBase64),
    [data?.config?.qrCodeBase64]
  );

  async function load() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/${slug}/whatsapp`, {
        cache: "no-store",
      });
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error(error);
      setMessage("Erro ao carregar configuração do WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/${slug}/whatsapp`, {
        method: "POST",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Erro ao conectar WhatsApp");
      }

      setMessage("Instância preparada. Leia o QR Code ou use o código de pareamento.");
      await load();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erro ao conectar WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!testNumber.trim()) {
      setMessage("Informe um número no formato +5511999999999.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/${slug}/whatsapp/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: testNumber.trim() }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Erro ao enviar teste");
      }

      setMessage("Mensagem de teste enviada.");
      await load();
    } catch (error: any) {
      console.error(error);
      setMessage(error?.message || "Erro ao enviar teste.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [slug]);

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">WhatsApp da barbearia</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Conecte seu número para automatizar o envio de lembretes e confirmações de agendamento.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Status</div>
            <div className={`mt-1 text-sm font-semibold ${data?.config?.status === 'CONNECTED' ? 'text-emerald-600' : 'text-neutral-900 dark:text-neutral-100'}`}>
              {loading ? (
                <span className="animate-pulse">Carregando...</span>
              ) : (
                data?.config?.status || "DESCONECTADO"
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Instância</div>
            <div className="mt-1 break-all text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {loading ? "Carregando..." : data?.config?.instanceName || "-"}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Telefone</div>
            <div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {loading ? "Carregando..." : data?.config?.connectedPhone || "-"}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Perfil</div>
            <div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {loading ? "Carregando..." : data?.config?.profileName || "-"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {busy ? "Processando..." : "Conectar / gerar QR"}
          </button>

          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Atualizar status
          </button>
        </div>

        {message ? (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300">
            {message}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Pareamento</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Siga as instruções no seu WhatsApp: Configurações &gt; Aparelhos conectados.
        </p>

        {data?.config?.pairingCode ? (
          <div className="mt-6 inline-block rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-950">
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">Código de pareamento</div>
            <div className="mt-2 text-4xl font-mono font-bold tracking-[0.2em] text-neutral-900 dark:text-white">
              {data.config.pairingCode}
            </div>
          </div>
        ) : null}

        {qrImageSrc ? (
          <div className="mt-6 flex flex-col items-start">
            <img
              src={qrImageSrc}
              alt="QR Code do WhatsApp"
              className="h-64 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-inner dark:border-neutral-700"
            />
            <span className="mt-3 text-xs text-neutral-400">O QR Code expira em alguns minutos.</span>
          </div>
        ) : null}

        {!qrImageSrc && data?.config?.qrCodeText ? (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Conteúdo bruto do QR
            </label>
            <textarea
              readOnly
              value={data.config.qrCodeText}
              className="min-h-[100px] w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-600 outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
            />
          </div>
        ) : null}

        {!data?.config?.pairingCode && !qrImageSrc && !data?.config?.qrCodeText ? (
          <p className="mt-4 text-sm text-neutral-600">
            Clique em <strong>Conectar / gerar QR</strong> para iniciar o pareamento.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Teste de envio</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Verifique se a conexão está funcionando enviando uma mensagem para você mesmo.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="+5511999999999"
            className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none ring-black transition-all focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:ring-white"
          />

          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Enviar teste
          </button>
        </div>
      </div>
    </div>
  );
}
