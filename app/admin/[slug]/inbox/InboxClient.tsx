"use client";

import { useEffect, useMemo, useState } from "react";

type Conversation = {
  clientId: string;
  clientName: string;
  phoneE164: string;
  lastMessage: {
    direction: "inbound" | "outbound";
    textBody: string;
    createdAt: string;
  } | null;
};

type ConversationListResponse = {
  tenant: {
    id: string;
    name: string;
  };
  conversations: Conversation[];
};

type ThreadMessage = {
  id: string;
  direction: "inbound" | "outbound";
  textBody: string;
  type: string;
  waMessageId: string | null;
  createdAt: string;
};

type ThreadResponse = {
  client: {
    id: string;
    name: string;
    phoneE164: string;
  };
  messages: ThreadMessage[];
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

function formatPreview(text: string) {
  if (!text) return "";
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

export default function InboxClient({ slug }: { slug: string }) {
  const [data, setData] = useState<ConversationListResponse | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [replyText, setReplyText] = useState("");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadConversations() {
    try {
      setLoadingList(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/inbox`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar inbox");
      }

      setData(json);

      if (!selectedClientId && json.conversations.length > 0) {
        setSelectedClientId(json.conversations[0].clientId);
      } else if (
        selectedClientId &&
        !json.conversations.some((c: Conversation) => c.clientId === selectedClientId)
      ) {
        setSelectedClientId(json.conversations[0]?.clientId || "");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar inbox");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadThread(clientId: string) {
    if (!clientId) {
      setThread(null);
      return;
    }

    try {
      setLoadingThread(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/inbox/${clientId}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar conversa");
      }

      setThread(json);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar conversa");
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [slug]);

  useEffect(() => {
    if (selectedClientId) {
      loadThread(selectedClientId);
    } else {
      setThread(null);
    }
  }, [selectedClientId, slug]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedClientId || !replyText.trim()) return;

    try {
      setSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(
        `/api/admin/${slug}/inbox/${selectedClientId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: replyText.trim(),
          }),
        }
      );

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao enviar mensagem");
      }

      setReplyText("");
      setSuccessMessage("Mensagem enviada com sucesso.");

      await Promise.all([
        loadConversations(),
        loadThread(selectedClientId),
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  const selectedConversation = useMemo(() => {
    return data?.conversations.find((c) => c.clientId === selectedClientId) || null;
  }, [data, selectedClientId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Atendimento
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            Inbox do WhatsApp
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Visualize e responda mensagens recebidas no salão.
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

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        
        {/* Painel Esquerdo: Lista de Conversas */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 flex flex-col max-h-[700px]">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Conversas</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-5 text-zinc-600 dark:text-zinc-400">Carregando...</div>
            ) : !data?.conversations.length ? (
              <div className="p-5 text-zinc-600 dark:text-zinc-400">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.conversations.map((conversation) => {
                  const active = conversation.clientId === selectedClientId;

                  return (
                    <button
                      key={conversation.clientId}
                      type="button"
                      onClick={() => setSelectedClientId(conversation.clientId)}
                      className={[
                        "block w-full px-5 py-4 text-left transition",
                        active 
                          ? "bg-violet-50 dark:bg-violet-900/20" 
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                            {conversation.clientName}
                          </p>
                          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                            {conversation.phoneE164}
                          </p>
                        </div>

                        {conversation.lastMessage?.createdAt && (
                          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                            {new Date(conversation.lastMessage.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">
                          {conversation.lastMessage?.direction === "outbound"
                            ? "Você: "
                            : ""}
                        </span>
                        {formatPreview(conversation.lastMessage?.textBody || "")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Painel Direito: Chat */}
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            {selectedConversation ? (
              <>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {selectedConversation.clientName}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedConversation.phoneE164}
                </p>
              </>
            ) : (
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Selecione uma conversa
              </h2>
            )}
          </div>

          <div className="flex-1 bg-zinc-50 px-4 py-5 overflow-y-auto dark:bg-[#0b141a]"> {/* Cor de fundo mais escura estilo WhatsApp web */}
            {!selectedClientId ? (
              <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                Nenhuma conversa selecionada.
              </div>
            ) : loadingThread ? (
              <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                Carregando conversa...
              </div>
            ) : !thread?.messages.length ? (
              <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                Nenhuma mensagem nesta conversa.
              </div>
            ) : (
              <div className="space-y-3">
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={[
                      "flex",
                      message.direction === "outbound"
                        ? "justify-end"
                        : "justify-start",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                        message.direction === "outbound"
                          ? "bg-violet-600 text-white dark:bg-violet-700"
                          : "bg-white text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700",
                      ].join(" ")}
                    >
                      <p className="whitespace-pre-wrap text-sm">
                        {message.textBody}
                      </p>
                      <p
                        className={[
                          "mt-2 text-xs",
                          message.direction === "outbound"
                            ? "text-violet-200 dark:text-violet-300"
                            : "text-zinc-400 dark:text-zinc-500",
                        ].join(" ")}
                      >
                        {new Date(message.createdAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendReply}
            className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder={
                  selectedClientId
                    ? "Digite sua resposta..."
                    : "Selecione uma conversa para responder"
                }
                disabled={!selectedClientId || sending}
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-violet-500 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800 transition"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedClientId || !replyText.trim() || sending}
                  className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
                >
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}