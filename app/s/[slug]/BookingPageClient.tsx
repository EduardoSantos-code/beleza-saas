"use client";

import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

type Professional = {
  id: string;
  name: string;
};

type CatalogResponse = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
    primaryColor?: string | null;
    publicDescription?: string | null;
    publicPhone?: string | null;
    address?: string | null;
    instagram?: string | null;
  };
  services: Service[];
  professionals: Professional[];
};

type Slot = {
  iso: string;
  label: string;
};

export default function BookingPageClient({ slug }: { slug: string }) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientPhoneE164, setClientPhoneE164] = useState("+55");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        setErrorMessage("");

        const res = await fetch(`/api/public/${slug}/catalog`, {
          method: "GET",
          cache: "no-store",
        });

        const text = await res.text();
        let data: CatalogResponse | { error?: string } | null = null;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Resposta inválida da API: ${text}`);
        }

        if (!res.ok) {
          throw new Error(
            (data as { error?: string })?.error || "Erro ao carregar catálogo"
          );
        }

        const parsed = data as CatalogResponse;
        setCatalog(parsed);

        if (parsed.services?.length > 0) {
          setServiceId(parsed.services[0].id);
        }

        if (parsed.professionals?.length > 0) {
          setProfessionalId(parsed.professionals[0].id);
        }

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        setDate(`${yyyy}-${mm}-${dd}`);
      } catch (err: any) {
        console.error("Erro ao carregar catálogo:", err);
        setErrorMessage(err.message || "Erro inesperado ao carregar catálogo");
      } finally {
        setLoadingCatalog(false);
      }
    }

    if (slug) {
      loadCatalog();
    }
  }, [slug]);

  useEffect(() => {
    async function loadSlots() {
      if (!serviceId || !professionalId || !date) return;

      try {
        setLoadingSlots(true);

        const qs = new URLSearchParams({
          serviceId,
          professionalId,
          date,
        });

        const res = await fetch(
          `/api/public/${slug}/availability?${qs.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const text = await res.text();
        let data: { slots?: Slot[]; error?: string } | null = null;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Resposta inválida da API de horários: ${text}`);
        }

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar horários");
        }

        setSlots(data?.slots || []);
      } catch (err: any) {
        console.error("Erro ao carregar horários:", err);
        setSlots([]);
        setErrorMessage(err.message || "Erro ao carregar horários");
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [slug, serviceId, professionalId, date]);

  const selectedService = useMemo(() => {
    return catalog?.services.find((s) => s.id === serviceId) || null;
  }, [catalog, serviceId]);

  const primaryColor = catalog?.tenant.primaryColor || "#7c3aed";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSlot) {
      setErrorMessage("Selecione um horário.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId,
          professionalId,
          startAtISO: selectedSlot,
          clientName,
          clientPhoneE164,
          notes,
        }),
      });

      const text = await res.text();
      let data: { ok?: boolean; error?: string; appointmentId?: string } | null = null;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Resposta inválida da API de agendamento: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao criar agendamento");
      }

      // Redireciona o cliente para o recibo do agendamento:
      if (data?.appointmentId) {
        window.location.href = `/s/${slug}/a/${data.appointmentId}`;
      }
    } catch (err: any) {
      console.error("Erro ao agendar:", err);
      setErrorMessage(err.message || "Erro inesperado ao agendar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCatalog) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Carregando...</p>
        </div>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900">
          <p className="text-red-600 dark:text-red-400">
            {errorMessage || "Não foi possível carregar a página."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      <section className="relative w-full bg-zinc-900">
        {/* Imagem de fundo e degradê */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: catalog.tenant.heroImageUrl
              ? `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.85)), url('${catalog.tenant.heroImageUrl}')`
              : `linear-gradient(135deg, ${primaryColor}, #111827)`,
          }}
        />

        {/* Conteúdo do Banner */}
        <div className="relative z-10 mx-auto flex min-h-[340px] max-w-6xl flex-col justify-end px-4 pb-8 pt-20 md:min-h-[380px] md:pb-12">
          
          {/* Botão de Tema (com pointer-events-auto para ser clicável) */}
          <div className="absolute right-4 top-4 z-20 pointer-events-auto">
            <ThemeToggle />
          </div>

          <div className="pointer-events-none mt-auto text-white">
            
            {/* Logo e Nome do Salão */}
            <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {catalog.tenant.logoUrl ? (
                <img
                  src={catalog.tenant.logoUrl}
                  alt={catalog.tenant.name}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-white/40 md:h-24 md:w-24"
                />
              ) : (
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white md:h-24 md:w-24"
                  style={{ backgroundColor: primaryColor }}
                >
                  {catalog.tenant.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80 md:text-sm">
                  Agendamento online
                </p>
                <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
                  {catalog.tenant.name}
                </h1>
              </div>
            </div>

            {/* Descrição */}
            {catalog.tenant.publicDescription && (
              <p className="max-w-2xl text-sm text-white/90 md:text-base">
                {catalog.tenant.publicDescription}
              </p>
            )}

            {/* Pílulas de Contato/Endereço */}
            <div className="mt-5 flex flex-wrap gap-2 text-xs md:text-sm">
              {catalog.tenant.publicPhone && (
                <span className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-md">
                  {catalog.tenant.publicPhone}
                </span>
              )}
              {catalog.tenant.instagram && (
                <span className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-md">
                  {catalog.tenant.instagram}
                </span>
              )}
              {catalog.tenant.address && (
                <span className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-md">
                  {catalog.tenant.address}
                </span>
              )}
            </div>

          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Serviço
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {catalog.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {service.durationMin} min — R${" "}
                      {(service.priceCents / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Profissional
                </label>
                <select
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {catalog.professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full appearance-none text-left min-h-[50px] [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-start rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [color-scheme:light_dark]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Duração
                </label>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-700 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:text-zinc-300">
                  {selectedService ? `${selectedService.durationMin} minutos` : "-"}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Horários disponíveis
                </h2>
                {loadingSlots && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando horários...</span>
                )}
              </div>

              {slots.length === 0 && !loadingSlots ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
                  Nenhum horário disponível para essa data.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {slots.map((slot) => {
                    const selected = selectedSlot === slot.iso;

                    return (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setSelectedSlot(slot.iso)}
                        className={[
                          "rounded-xl border px-4 py-3 text-sm font-medium transition",
                          selected
                            ? "text-white"
                            : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
                        ].join(" ")}
                        style={
                          selected
                            ? {
                                borderColor: primaryColor,
                                backgroundColor: primaryColor,
                                color: "white",
                              }
                            : undefined
                        }
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Seus dados</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Preencha para confirmar o agendamento.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={clientPhoneE164}
                  onChange={(e) => setClientPhoneE164(e.target.value)}
                  placeholder="+5511999999999"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  required
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Use formato internacional. Ex.: +5511999999999
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opcional"
                  rows={4}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Serviço</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedService?.name || "-"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Preço</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedService
                      ? `R$ ${(selectedService.priceCents / 100).toFixed(2)}`
                      : "-"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Horário</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedSlot
                      ? new Date(selectedSlot).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "-"}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl px-4 py-3 font-medium text-white transition disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? "Confirmando..." : "Confirmar agendamento"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}