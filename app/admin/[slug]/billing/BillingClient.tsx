"use client";

import { useEffect, useMemo, useState } from "react";

type TenantBilling = {
  id: string;
  name: string;
  slug: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
};

type BillingResponse = {
  tenant: TenantBilling;
  billingActive: boolean;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da API: ${text.slice(0, 300)}`);
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "NONE":
      return "Sem assinatura";
    case "TRIALING":
      return "Em teste";
    case "ACTIVE":
      return "Ativa";
    case "PAST_DUE":
      return "Pagamento atrasado";
    case "CANCELED":
      return "Cancelada";
    case "INCOMPLETE":
      return "Incompleta";
    case "INCOMPLETE_EXPIRED":
      return "Expirada";
    case "UNPAID":
      return "Não paga";
    case "PAUSED":
      return "Pausada";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400";
    case "TRIALING":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400";
    case "PAST_DUE":
    case "UNPAID":
      return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "CANCELED":
    case "INCOMPLETE_EXPIRED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300";
  }
}

export default function BillingClient({ slug }: { slug: string }) {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const trialDaysLeft = useMemo(() => {
    if (!data?.tenant.trialEndsAt) return null;

    const diff =
      new Date(data.tenant.trialEndsAt).getTime() - new Date().getTime();

    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [data]);

  async function loadBilling() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/billing`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar assinatura");
      }

      setData(json);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao carregar assinatura");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();

    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      setSuccessMessage(
        "Checkout concluído. A assinatura será atualizada assim que o webhook da Stripe confirmar o pagamento."
      );
    }

    if (params.get("canceled") === "true") {
      setErrorMessage("Checkout cancelado.");
    }
  }, [slug]);

  async function handleCheckout() {
    try {
      setStartingCheckout(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/billing/checkout`, {
        method: "POST",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao iniciar checkout");
      }

      window.location.href = json.url;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao iniciar checkout");
    } finally {
      setStartingCheckout(false);
    }
  }

  async function handlePortal() {
    try {
      setOpeningPortal(true);
      setErrorMessage("");

      const res = await fetch(`/api/admin/${slug}/billing/portal`, {
        method: "POST",
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao abrir portal");
      }

      window.location.href = json.url;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao abrir portal");
    } finally {
      setOpeningPortal(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            SaaS
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            Assinatura
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Gerencie a assinatura mensal do salão.
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

      {loading ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
        </section>
      ) : data ? (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  {data.tenant.name}
                </h2>

                <div
                  className={`mt-4 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusClass(
                    data.tenant.subscriptionStatus
                  )}`}
                >
                  {statusLabel(data.tenant.subscriptionStatus)}
                </div>

                <div className="mt-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Acesso ativo:
                    </span>{" "}
                    {data.billingActive ? "Sim" : "Não"}
                  </p>

                  {data.tenant.trialEndsAt && (
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        Trial termina em:
                      </span>{" "}
                      {new Date(data.tenant.trialEndsAt).toLocaleDateString(
                        "pt-BR"
                      )}
                      {trialDaysLeft !== null && ` (${trialDaysLeft} dias)`}
                    </p>
                  )}

                  {data.tenant.subscriptionCurrentPeriodEnd && (
                    <p>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        Período atual termina em:
                      </span>{" "}
                      {new Date(
                        data.tenant.subscriptionCurrentPeriodEnd
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  )}

                  {data.tenant.subscriptionCancelAtPeriodEnd && (
                    <p className="text-yellow-700 dark:text-yellow-400">
                      A assinatura está marcada para cancelar no fim do período.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={startingCheckout}
                  className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60 transition"
                >
                  {startingCheckout
                    ? "Abrindo checkout..."
                    : data.tenant.stripeSubscriptionId
                    ? "Nova assinatura"
                    : "Assinar agora"}
                </button>

                {data.tenant.stripeCustomerId && (
                  <button
                    type="button"
                    onClick={handlePortal}
                    disabled={openingPortal}
                    className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                  >
                    {openingPortal
                      ? "Abrindo portal..."
                      : "Gerenciar assinatura"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Plano mensal
            </h2>

            <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900/50 dark:bg-violet-900/10">
              <p className="text-sm font-medium uppercase tracking-wide text-violet-700 dark:text-violet-400">
                Plano Pro
              </p>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                Definido no Stripe
              </p>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                O valor e a recorrência são controlados pelo Price ID configurado
                em <code className="rounded bg-white px-1 dark:bg-zinc-950 dark:text-zinc-300">STRIPE_PRICE_ID_MONTHLY</code>.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li>✓ Agendamento online</li>
                <li>✓ Painel interno</li>
                <li>✓ WhatsApp</li>
                <li>✓ Horários e bloqueios</li>
                <li>✓ Branding do salão</li>
              </ul>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-red-600 dark:text-red-400">Não foi possível carregar a assinatura.</p>
        </section>
      )}
    </div>
  );
}