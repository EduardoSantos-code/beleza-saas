"use client";
import { prisma } from "@/lib/prisma";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { formatBR } from "@/lib/date";
import { 
  Scissors, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  Phone, 
  AlignLeft,
  ChevronDown,
  Info,
  Crown,
  CheckCircle
} from "lucide-react";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
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
  club?: {
    enabled: boolean;
    plansCount: number;
    paymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
  };
};

type Slot = {
  iso: string;
  label: string;
};

type ActiveClubMembership = {
  subscriptionId: string;
  planId: string;
  planName: string;
  discountPercent: number | null;
  currentPeriodEnd: string;
};

type ClubBenefitEligibility = {
  ok: boolean;
  hasActiveMembership: boolean;
  membership?: {
    subscriptionId: string;
    planName: string;
    discountPercent: number | null;
  };
  includedBenefit?: {
    configured: boolean;
    eligible: boolean;
    available: boolean;
    usedCount: number;
    totalAllowed: number;
  };
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

  // Estados do Clube
  const [clubPhone, setClubPhone] = useState("+55");
  const [clubCode, setClubCode] = useState("");
  const [clubStep, setClubStep] = useState<"IDLE" | "PHONE" | "CODE" | "VERIFIED">("IDLE");
  const [clubLoading, setClubLoading] = useState(false);
  const [clubError, setClubError] = useState("");
  const [clubMessage, setClubMessage] = useState("");
  const [clubDevCode, setClubDevCode] = useState("");
  const [activeClubMembership, setActiveClubMembership] = useState<ActiveClubMembership | null>(null);
  const [validatedClubPhone, setValidatedClubPhone] = useState<string | null>(null);

  const [clubBenefitEligibility, setClubBenefitEligibility] = useState<ClubBenefitEligibility | null>(null);
  const [clubBenefitEligibilityLoading, setClubBenefitEligibilityLoading] = useState(false);
  const [clubBenefitEligibilityError, setClubBenefitEligibilityError] = useState<string | null>(null);

  const includedBenefitConfigured = 
    Boolean(clubBenefitEligibility?.includedBenefit?.configured);
  const includedBenefitEligible = 
    Boolean(clubBenefitEligibility?.includedBenefit?.eligible);
  const includedBenefitAvailable = 
    Boolean(clubBenefitEligibility?.includedBenefit?.available);
  const membershipDiscountPercent = 
    clubBenefitEligibility?.membership?.discountPercent ?? null;
  
  const benefitUsage = {
    remaining: (clubBenefitEligibility?.includedBenefit?.totalAllowed ?? 0) - (clubBenefitEligibility?.includedBenefit?.usedCount ?? 0),
    total: clubBenefitEligibility?.includedBenefit?.totalAllowed ?? 0
  };

  const selectedProfessional = useMemo(() => {
    return catalog?.professionals.find((p) => p.id === professionalId) || null;
  }, [catalog, professionalId]);

  const selectedSlotLabel = useMemo(() => {
    return slots.find((s) => s.iso === selectedSlot)?.label || "";
  }, [slots, selectedSlot]);

  const displayDate = useMemo(() => {
    if (!date) return "-";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }, [date]);

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

        try { data = JSON.parse(text); } 
        catch { throw new Error(`Resposta inválida da API: ${text}`); }

        if (!res.ok) throw new Error((data as { error?: string })?.error || "Erro ao carregar catálogo");

        const parsed = data as CatalogResponse;
        setCatalog(parsed);

        if (parsed.professionals?.length > 0) setProfessionalId(parsed.professionals[0].id);

        const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        setDate(hoje);

      } catch (err: any) {
        setErrorMessage(err.message || "Erro inesperado ao carregar catálogo");
      } finally {
        setLoadingCatalog(false);
      }
    }
    if (slug) loadCatalog();
  }, [slug]);

  useEffect(() => {
    async function loadSlots() {
      if (!serviceId || !professionalId || !date) return;
      try {
        setLoadingSlots(true);
        const qs = new URLSearchParams({ serviceId, professionalId, date });
        const res = await fetch(`/api/public/${slug}/availability?${qs.toString()}`, {
          method: "GET", cache: "no-store",
        });

        const text = await res.text();
        let data: { slots?: Slot[]; error?: string } | null = null;

        try { data = JSON.parse(text); } 
        catch { throw new Error(`Resposta API horários: ${text}`); }

        if (!res.ok) throw new Error(data?.error || "Erro ao carregar horários");

        setSlots(data?.slots || []);
      } catch (err: any) {
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

  async function loadClubBenefitEligibility(sId: string, sDate: string) {
    if (!activeClubMembership) {
      setClubBenefitEligibility(null);
      return;
    }
    try {
      setClubBenefitEligibilityLoading(true);
      setClubBenefitEligibilityError(null);
      const qs = new URLSearchParams({ serviceId: sId, date: sDate });
      const res = await fetch(`/api/public/${slug}/club/benefit/eligibility?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao verificar elegibilidade");
      const data: ClubBenefitEligibility = await res.json();
      setClubBenefitEligibility(data);
    } catch (err) {
      setClubBenefitEligibility(null);
    } finally {
      setClubBenefitEligibilityLoading(false);
    }
  }

  useEffect(() => {
    if (activeClubMembership && serviceId && date) {
      loadClubBenefitEligibility(serviceId, date);
    } else {
      setClubBenefitEligibility(null);
    }
  }, [activeClubMembership, serviceId, date]);

  useEffect(() => {
    if (!activeClubMembership) {
      setClubBenefitEligibility(null);
    }
  }, [activeClubMembership]);

  const primaryColor = catalog?.tenant.primaryColor || "#10b981";

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // 1. Remove tudo que não for número ou o sinal de +
    value = value.replace(/[^\d+]/g, "");
    // 2. Garante que sempre comece com +55
    if (!value.startsWith("+55")) {
      value = "+55" + value.replace(/\D/g, "");
    }
    // 3. Remove qualquer espaço que possa ter sobrado (redundância)
    value = value.trim();
    // 4. Limita ao tamanho máximo de 14 caracteres (+ + 13 números)
    if (value.length <= 14) {
      setClientPhoneE164(value);
    }
  };

  const handleClubPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d+]/g, "");
    if (!value.startsWith("+55")) {
      value = "+55" + value.replace(/\D/g, "");
    }
    value = value.trim();
    if (value.length <= 14) {
      setClubPhone(value);
    }
  };

  const handleSendClubCode = async () => {
    if (clubPhone.length !== 14 || !clubPhone.startsWith("+55")) {
      setClubError("Formato inválido. Use +55 e o DDD (Ex: +5511999998888).");
      return;
    }
    try {
      setClubLoading(true);
      setClubError("");
      setClubMessage("");
      setClubDevCode("");

      const res = await fetch(`/api/public/${slug}/club/benefit/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164: clubPhone }),
      });

      const text = await res.text();
      let data: { error?: string; devCode?: string } | null = null;
      try { data = JSON.parse(text); } catch { throw new Error(`Resposta API: ${text}`); }

      if (!res.ok) throw new Error(data?.error || "Erro ao enviar código.");

      if (data?.devCode) setClubDevCode(data.devCode);
      setClubMessage("Código enviado para seu WhatsApp!");
      setClubStep("CODE");
    } catch (err: unknown) {
      if (err instanceof Error) setClubError(err.message);
      else setClubError("Erro inesperado ao enviar código.");
    } finally {
      setClubLoading(false);
    }
  };

  const handleVerifyClubCode = async () => {
    if (clubCode.length !== 6) {
      setClubError("O código deve ter exatamente 6 dígitos.");
      return;
    }
    try {
      setClubLoading(true);
      setClubError("");
      setClubMessage("");

      const res = await fetch(`/api/public/${slug}/club/benefit/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneE164: clubPhone, code: clubCode }),
      });

      const text = await res.text();
      let data: { error?: string; membership?: ActiveClubMembership } | null = null;
      try { data = JSON.parse(text); } catch { throw new Error(`Resposta API: ${text}`); }

      if (!res.ok) throw new Error(data?.error || "Erro ao validar código.");

      if (data?.membership) {
        setActiveClubMembership(data.membership);
        setValidatedClubPhone(clubPhone);
        setClubStep("VERIFIED");
      }
    } catch (err: unknown) {
      if (err instanceof Error) setClubError(err.message);
      else setClubError("Erro inesperado ao validar código.");
    } finally {
      setClubLoading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!serviceId) {
      setErrorMessage("Por favor, escolha qual serviço você deseja realizar.");
      return;
    }
    if (!selectedSlot) {
      setErrorMessage("Por favor, selecione um horário disponível.");
      return;
    }
    if (clientName.trim().length < 3) {
      setErrorMessage("Por favor, digite seu nome completo (mínimo 3 letras).");
      return;
    }
    if (clientPhoneE164.length !== 14 || !clientPhoneE164.startsWith("+55")) {
      setErrorMessage("O número deve ter o formato +55 seguido de DDD e 9 dígitos (Ex: +5511999998888).");
      return;
    }
    
    if (activeClubMembership && clientPhoneE164.trim() !== validatedClubPhone) {
      setErrorMessage("O WhatsApp do agendamento precisa ser o mesmo validado no clube.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      console.log("[BOOKING_SUBMIT_DEBUG]", {
        useClubBenefit: Boolean(activeClubMembership),
        validatedClubPhone,
        clientPhoneE164,
        selectedServiceId: selectedService?.id ?? null,
      });

      const res = await fetch(`/api/public/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId, professionalId, startAt: selectedSlot, 
          clientName: clientName.trim(), clientPhoneE164: clientPhoneE164.trim(), notes,
          useClubBenefit: Boolean(activeClubMembership)
        }),
      });

      const text = await res.text();
      let data: { id?: string; error?: string } | null = null;

      try { data = JSON.parse(text); } 
      catch { throw new Error(`Resposta API: ${text}`); }

      if (!res.ok) throw new Error(data?.error || "Erro ao criar agendamento");

      if (data?.id) window.location.href = `/s/${slug}/a/${data.id}`;
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao agendar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCatalog) return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
      <p className="mt-4 font-black text-zinc-500 uppercase tracking-widest text-xs">Preparando agenda...</p>
    </main>
  );

  if (!catalog) return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-xl text-center">
        <p className="text-red-500 font-bold">{errorMessage || "Página não encontrada."}</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* HERO SECTION / BANNER */}
      <section className="relative w-full bg-zinc-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: catalog.tenant.heroImageUrl
              ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url('${catalog.tenant.heroImageUrl}')`
              : `linear-gradient(135deg, ${primaryColor}, #09090b)`,
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[380px] max-w-6xl flex-col justify-end px-4 pb-12 pt-20">
          <div className="absolute right-4 top-4 z-20 pointer-events-auto">
            <ThemeToggle />
          </div>

          <div className="pointer-events-none mt-auto text-white">
            <div className="mb-6 flex flex-col items-start gap-5 sm:flex-row sm:items-end">
              
              {/* --- AJUSTE DA LOGO: O JEITO DEFINITIVO --- */}
              {catalog.tenant.logoUrl ? (
                <img
                  src={catalog.tenant.logoUrl}
                  alt={catalog.tenant.name}
                  className="h-24 md:h-32 w-auto min-w-[6rem] max-w-[250px] shrink-0 rounded-[1.5rem] bg-white object-contain shadow-2xl ring-4 ring-white/20"
                />
              ) : (
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.5rem] text-4xl font-black text-white ring-4 ring-white/20 shadow-2xl md:h-32 md:w-32"
                  style={{ backgroundColor: primaryColor }}
                >
                  {catalog.tenant.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">
                  Agendamento Online
                </p>
                <h1 className="text-4xl font-black italic leading-tight sm:text-5xl md:text-6xl tracking-tighter">
                  {catalog.tenant.name}
                </h1>
              </div>
            </div>

            {catalog.tenant.publicDescription && (
              <p className="max-w-2xl text-sm font-medium text-white/80 leading-relaxed">
                {catalog.tenant.publicDescription}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
              {catalog.tenant.publicPhone && (
                <span className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                  {catalog.tenant.publicPhone}
                </span>
              )}
              {catalog.tenant.instagram && (
                <span className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                  {catalog.tenant.instagram}
                </span>
              )}
              {catalog.tenant.address && (
                <span className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                  {catalog.tenant.address}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL (SPLIT SCREEN) */}
      <div className="mx-auto max-w-6xl px-4 py-10 pb-24">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] items-start">
          
          {/* CARD DO CLUBE (MOBILE ONLY - TOP) */}
          {catalog.club?.enabled && (
            <div className="lg:hidden mb-2 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 ring-1 ring-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:ring-amber-900/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                  <Crown size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">
                    Clube de Assinaturas
                  </h3>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Planos exclusivos para você.
                  </p>
                </div>
              </div>
              <a
                href={`/s/${slug}/clube`}
                className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-600 transition-colors"
              >
                Ver
              </a>
            </div>
          )}

          {/* COLUNA ESQUERDA: ESCOLHAS */}
          <section className="rounded-3xl bg-white p-6 md:p-8 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none space-y-8">
            
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500">
                  1. O que vamos fazer?
                </label>
                <div className="relative">
                  <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-10 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all cursor-pointer"
                  >
                    <option value="">Selecione um serviço...</option>
                    {catalog.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} — {service.durationMin} min — R$ {(service.price / 100).toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 w-full">
                
                {/* 2. Com quem? */}
                <div className="min-w-0 w-full">
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500">
                    2. Com quem?
                  </label>
                  <div className="relative w-full">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                    <select
                      value={professionalId}
                      onChange={(e) => setProfessionalId(e.target.value)}
                      className="w-full min-w-0 appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-10 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all cursor-pointer"
                    >
                      {catalog?.professionals.map((prof) => (
                        <option key={prof.id} value={prof.id}>{prof.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Qual dia? */}
                <div className="min-w-0 w-full">
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500">
                    3. Qual dia?
                  </label>
                  {/* CAIXA DE FORA: Agora é ela quem tem a cor, a borda e o anel de foco */}
                  <div className="relative w-full rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-white transition-all">
                    
                    {/* ÍCONE: Fica de fundo, protegido */}
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none z-0" />
                    
                    {/* INPUT: Fica totalmente transparente, segurando as regras anti-quebra do iPhone */}
                    <input
                      type="date"
                      value={date}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err) {} }}
                      onChange={(e) => setDate(e.target.value)}
                      className="block w-full min-w-0 appearance-none bg-transparent pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer [color-scheme:light_dark] relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500">
                  4. Escolha o Horário
                </label>
                {loadingSlots && (
                  <span className="text-[10px] font-bold uppercase text-zinc-400 animate-pulse flex items-center gap-1">
                    <Clock size={12} /> Buscando...
                  </span>
                )}
              </div>

              {slots.length === 0 && !loadingSlots ? (
                <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Nenhum horário livre neste dia.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {slots.map((slot) => {
                    const selected = selectedSlot === slot.iso;
                    return (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setSelectedSlot(slot.iso)}
                        className={`rounded-2xl border-2 py-3 text-sm font-black transition-all ${
                          selected
                            ? "border-transparent text-white shadow-lg scale-[1.02]"
                            : "border-zinc-100 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 hover:dark:border-zinc-700"
                        }`}
                        style={selected ? { backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` } : undefined}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* COLUNA DIREITA: DADOS E CHECKOUT */}
          <aside className="rounded-3xl bg-white p-6 md:p-8 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none sticky top-6">
            
            {/* CARD DO CLUBE (DESKTOP) */}
            {catalog.club?.enabled && (
              <div className="hidden lg:flex mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:ring-amber-900/50 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Crown size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[10px] font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">
                    Clube VIP
                  </h3>
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
                    Assine e garanta benefícios exclusivos.
                  </p>
                </div>
                <a
                  href={`/s/${slug}/clube`}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-amber-600 transition-colors"
                >
                  Ver
                </a>
              </div>
            )}

            {/* CARD DE VALIDAÇÃO DE BENEFÍCIO DO CLUBE */}
            {catalog.club?.enabled && (
              <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 ring-1 ring-amber-200 dark:from-amber-950/20 dark:to-orange-950/20 dark:ring-amber-900/50">
                
                {clubStep === "IDLE" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                        <Crown size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">
                          Já é assinante?
                        </h3>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          Valide seu WhatsApp para usar benefícios do clube neste agendamento.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClubStep("PHONE")}
                      className="w-full rounded-xl bg-amber-500 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                    >
                      Sou assinante
                    </button>
                  </div>
                )}

                {clubStep === "PHONE" && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase">Qual seu WhatsApp?</h3>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={14}
                      value={clubPhone}
                      onChange={handleClubPhoneChange}
                      className="w-full rounded-xl border border-amber-200 bg-white p-3 text-sm font-bold text-zinc-900 outline-none dark:border-amber-900/50 dark:bg-zinc-900 dark:text-white"
                    />
                    {clubError && <p className="text-xs font-bold text-red-600 dark:text-red-400">{clubError}</p>}
                    <button
                      type="button"
                      onClick={handleSendClubCode}
                      disabled={clubLoading}
                      className="w-full rounded-xl bg-amber-500 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {clubLoading ? "Enviando..." : "Receber código"}
                    </button>
                  </div>
                )}

                {clubStep === "CODE" && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase">Digite o código</h3>
                    {clubMessage && <p className="text-xs font-bold text-green-600 dark:text-green-400">{clubMessage}</p>}
                    {clubDevCode && process.env.NODE_ENV !== "production" && <p className="text-xs font-mono text-zinc-500">Código de teste: {clubDevCode}</p>}
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={clubCode}
                      onChange={(e) => setClubCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-xl border border-amber-200 bg-white p-3 text-lg font-black tracking-[0.5em] text-center text-zinc-900 outline-none dark:border-amber-900/50 dark:bg-zinc-900 dark:text-white"
                    />
                    {clubError && <p className="text-xs font-bold text-red-600 dark:text-red-400">{clubError}</p>}
                    <button
                      type="button"
                      onClick={handleVerifyClubCode}
                      disabled={clubLoading}
                      className="w-full rounded-xl bg-amber-500 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {clubLoading ? "Validando..." : "Validar código"}
                    </button>
                  </div>
                )}

                {clubStep === "VERIFIED" && activeClubMembership && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">Assinatura Validada</h3>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Plano: {activeClubMembership.planName}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase mt-0.5">Verificando benefícios para o serviço...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tight">Finalizar</h2>
            <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Preencha seus dados para confirmar.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <input
                    type="text" // Mantemos text para aceitar o "+"
                    inputMode="tel" // Abre o teclado numérico no celular
                    value={clientPhoneE164}
                    onChange={handlePhoneChange} // 👈 Usando a função nova
                    placeholder="+5511999998888"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    required
                  />
                </div>
                <p className="mt-1 ml-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Formato: +55 + DDD + Número (Sem espaços)
                </p>
              </div>

              <div>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 h-5 w-5 text-zinc-400" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Alguma observação? (Opcional)"
                    rows={3}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all resize-none"
                  />
                </div>
              </div>

              {/* TICKET DE RESUMO */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50 mt-6 relative overflow-hidden">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-white dark:bg-zinc-900 rounded-r-full border-r border-y border-zinc-200 dark:border-zinc-800"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-white dark:bg-zinc-900 rounded-l-full border-l border-y border-zinc-200 dark:border-zinc-800"></div>
                
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-1.5"><Info size={12} /> Resumo do Agendamento</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold">Serviço</span>
                    <span className="font-black text-zinc-900 dark:text-white text-right max-w-[150px] truncate">{selectedService?.name || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3">
                    <span className="text-zinc-500 font-bold">Profissional</span>
                    <span className="font-black text-zinc-900 dark:text-white">{selectedProfessional?.name || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3">
                    <span className="text-zinc-500 font-bold">Horário</span>
                    <span className="font-black text-zinc-900 dark:text-white">
                      {displayDate} {selectedSlotLabel ? `às ${selectedSlotLabel}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3">
                    <span className="text-zinc-500 font-bold">Total</span>
                    <span className="font-black text-lg text-emerald-600 dark:text-emerald-500">
                      {selectedService ? `R$ ${(selectedService.price / 100).toFixed(2).replace('.', ',')}` : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* RESUMO DO BENEFÍCIO DO CLUBE */}
              {activeClubMembership && clubBenefitEligibility && (
                <div className="mt-4">
                  {clubBenefitEligibilityLoading ? (
                    <p className="text-[10px] font-bold text-zinc-400 uppercase animate-pulse">Verificando benefício do clube...</p>
                  ) : (
                    <>
                      {/* CASO A: Benefício Incluso Disponível */}
                      {includedBenefitConfigured && includedBenefitEligible && includedBenefitAvailable && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                            <h4 className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-100">Serviço Coberto</h4>
                          </div>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Este agendamento será coberto pelo seu clube.</p>
                          <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Uso disponível: {benefitUsage.remaining} de {benefitUsage.total}</p>
                        </div>
                      )}

                      {/* CASO B: Benefício Incluso Esgotado */}
                      {includedBenefitConfigured && includedBenefitEligible && !includedBenefitAvailable && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                            <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-100">Limite Atingido</h4>
                          </div>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Seu benefício incluído para este serviço já foi utilizado neste período.</p>
                          {membershipDiscountPercent && membershipDiscountPercent > 0 ? (
                            <p className="text-[10px] font-black text-amber-600 uppercase mt-1">Seu plano ainda aplica {membershipDiscountPercent}% de desconto.</p>
                          ) : (
                            <p className="text-[10px] font-black text-amber-600 uppercase mt-1">Este agendamento seguirá com preço normal.</p>
                          )}
                        </div>
                      )}

                      {/* CASO C: Não incluso, mas tem desconto */}
                      {!includedBenefitConfigured && membershipDiscountPercent && membershipDiscountPercent > 0 && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                            <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-100">Desconto VIP</h4>
                          </div>
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Este serviço não faz parte do benefício incluso do seu plano.</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Seu plano aplica {membershipDiscountPercent}% de desconto neste agendamento.</p>
                        </div>
                      )}

                      {/* CASO D: Sem benefício para este serviço */}
                      {!includedBenefitConfigured && (!membershipDiscountPercent || membershipDiscountPercent === 0) && (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Info className="h-4 w-4 text-zinc-400" />
                            <h4 className="text-xs font-black uppercase text-zinc-500">Plano Ativo</h4>
                          </div>
                          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Este serviço não possui benefício incluso configurado no seu plano.</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase mt-1">Este agendamento seguirá com preço normal.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeClubMembership && !clubBenefitEligibility && !clubBenefitEligibilityLoading && (
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-4">Selecione serviço e data para ver benefícios.</p>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  🚨 {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl py-5 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 shadow-xl"
                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}60` }}
              >
                {submitting ? "Processando..." : "Confirmar Horário"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </main>
  );
}