"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { formatBR } from "@/lib/date";
import Link from "next/link";
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
  CheckCircle,
  Search,
  Star,
  MessageSquare,
  ImageIcon,
  Users,
  ChevronRight,
  Send,
  History,
  Trash2,
  X
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
  imageUrl?: string | null;
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
  stats?: {
    averageRating: number;
    totalReviews: number;
    totalServicesRendered: number;
  };
};

type ReviewData = {
  id: string;
  clientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type GalleryPhotoData = {
  id: string;
  imageUrl: string;
  caption: string | null;
};

type HistoryAppointment = {
  id: string;
  status: string;
  startAt: string;
  notes: string | null;
  review?: { id: string } | null;
  service: { name: string; durationMin: number; price: number };
  professional: { name: string };
};

type PageTab = "agendamento" | "reservas" | "historico" | "galeria" | "avaliacoes";

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
  const primaryColor = catalog?.tenant.primaryColor || "#10b981";
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

  // Estados de Identificação do Cliente
  const [identified, setIdentified] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);

  useEffect(() => {
    const checkIdentified = () => {
      if (typeof window !== "undefined") {
        const savedPhone = localStorage.getItem("client_phone");
        const savedName = localStorage.getItem("client_name");
        if (savedPhone && savedName) {
          setClientPhoneE164(savedPhone);
          setClientName(savedName);
          setIdentified(true);
        } else {
          setIdentified(false);
        }
      }
    };

    checkIdentified();
    window.addEventListener("pageshow", checkIdentified);
    return () => {
      window.removeEventListener("pageshow", checkIdentified);
    };
  }, []);

  const handleCheckClientPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientPhoneE164.length !== 14 || !clientPhoneE164.startsWith("+55")) {
      setErrorMessage("O número deve ter o formato +55 seguido de DDD e 9 dígitos (Ex: +5511999998888).");
      return;
    }
    try {
      setCheckingPhone(true);
      setErrorMessage("");
      const res = await fetch(`/api/public/${slug}/client-check?phoneE164=${encodeURIComponent(clientPhoneE164)}`);
      if (!res.ok) throw new Error("Erro ao verificar telefone.");
      const data = await res.json();
      if (data.exists && data.name) {
        setClientName(data.name);
        setIdentified(true);
        localStorage.setItem("client_phone", clientPhoneE164);
        localStorage.setItem("client_name", data.name);
      } else {
        setIsNewClient(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro de conexão ao verificar telefone.");
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleRegisterClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName.trim().length < 3) {
      setErrorMessage("Por favor, digite seu nome completo (mínimo 3 letras).");
      return;
    }
    localStorage.setItem("client_phone", clientPhoneE164);
    localStorage.setItem("client_name", clientName.trim());
    setIdentified(true);
  };

  const handleResetClient = () => {
    localStorage.removeItem("client_phone");
    localStorage.removeItem("client_name");
    setClientPhoneE164("+55");
    setClientName("");
    setIdentified(false);
    setIsNewClient(false);
  };

  const [submitting, setSubmitting] = useState(false);

  // Estados de Tabs, Reviews, Galeria e Histórico
  const [activeTab, setActiveTab] = useState<PageTab>("agendamento");
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhotoData[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [historyAppointments, setHistoryAppointments] = useState<HistoryAppointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [reserving, setReserving] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState("");
  const [reserveError, setReserveError] = useState("");

  // Estados do formulário de review
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAppointmentId, setReviewAppointmentId] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/public/${slug}/reviews?limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      // silent
    } finally {
      setLoadingReviews(false);
    }
  }, [slug]);

  const loadGallery = useCallback(async () => {
    try {
      setLoadingGallery(true);
      const res = await fetch(`/api/public/${slug}/gallery`);
      if (!res.ok) return;
      const data = await res.json();
      setGalleryPhotos(data.photos || []);
    } catch {
      // silent
    } finally {
      setLoadingGallery(false);
    }
  }, [slug]);

  const loadHistory = useCallback(async () => {
    if (!identified || !clientPhoneE164) return;
    try {
      setLoadingHistory(true);
      const qs = new URLSearchParams({ phoneE164: clientPhoneE164 });
      const res = await fetch(`/api/public/${slug}/client-history?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryAppointments(data.appointments || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, [slug, identified, clientPhoneE164]);

  const loadReservations = useCallback(async () => {
    if (!identified || !clientPhoneE164) return;
    try {
      setLoadingReservations(true);
      const qs = new URLSearchParams({ phoneE164: clientPhoneE164 });
      const res = await fetch(`/api/public/${slug}/client-reservations?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingReservations(false);
    }
  }, [slug, identified, clientPhoneE164]);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch(`/api/public/${slug}/products`);
      if (!res.ok) return;
      const data = await res.json();
      setProductsList(data.products || []);
    } catch {
      // silent
    } finally {
      setLoadingProducts(false);
    }
  }, [slug]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setReserveError("");
    setReserveSuccess("");

    const items = Object.entries(selectedProducts)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (items.length === 0) {
      setReserveError("Selecione pelo menos um produto para reservar.");
      return;
    }

    try {
      setReserving(true);
      const res = await fetch(`/api/public/${slug}/client-reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneE164: clientPhoneE164,
          clientName,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao realizar reserva.");

      setReserveSuccess("Reserva realizada com sucesso! Retire seus produtos no estabelecimento. 🛍️");
      setSelectedProducts({});
      loadReservations();
      loadProducts();
    } catch (err: any) {
      setReserveError(err.message || "Erro inesperado.");
    } finally {
      setReserving(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

    try {
      const res = await fetch(`/api/public/${slug}/appointments/${apptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cancelar agendamento.");

      alert("Agendamento cancelado com sucesso!");
      loadHistory();
    } catch (err: any) {
      alert(err.message || "Erro ao cancelar agendamento.");
    }
  };

  // Load reviews, gallery, history, and reservations when tab changes
  useEffect(() => {
    if (activeTab === "avaliacoes") {
      loadReviews();
      if (identified) loadHistory();
    } else if (activeTab === "galeria") {
      loadGallery();
    } else if (activeTab === "historico" && identified) {
      loadHistory();
    } else if (activeTab === "reservas") {
      loadProducts();
      if (identified) loadReservations();
    }
  }, [activeTab, loadReviews, loadGallery, loadHistory, loadReservations, loadProducts, identified]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");

    if (!reviewAppointmentId) {
      setReviewError("Selecione um agendamento para avaliar.");
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }

    try {
      setSubmittingReview(true);
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: reviewAppointmentId,
          phoneE164: clientPhoneE164,
          clientName: clientName.trim(),
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar avaliação.");

      setReviewSuccess("Avaliação enviada com sucesso! Obrigado pelo feedback. ✨");
      setReviewRating(0);
      setReviewComment("");
      setReviewAppointmentId("");
      loadReviews();
      // Reload catalog to update stats
      try {
        const catRes = await fetch(`/api/public/${slug}/catalog`, { cache: "no-store" });
        if (catRes.ok) {
          const catData = await catRes.json();
          setCatalog(catData);
        }
      } catch {}
    } catch (err: any) {
      setReviewError(err.message || "Erro inesperado.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mês(es) atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/50" },
    CONFIRMED: { label: "Confirmado", color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/50" },
    COMPLETED: { label: "Concluído", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/50" },
    CANCELED: { label: "Cancelado", color: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/50" },
    NOSHOW: { label: "Não compareceu", color: "text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-950/20 dark:border-zinc-900/50" },
  };

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

  useEffect(() => {
    if (identified && clientPhoneE164) {
      setClubPhone(clientPhoneE164);
    }
  }, [identified, clientPhoneE164]);

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

        if (parsed.professionals && parsed.professionals.length > 0) setProfessionalId(parsed.professionals[0].id);

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

  if (!identified) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorative Gradient/Hero Image */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-md opacity-20 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage: catalog.tenant.heroImageUrl
              ? `url('${catalog.tenant.heroImageUrl}')`
              : `linear-gradient(135deg, ${primaryColor}, #09090b)`,
          }}
        />

        <div className="relative z-10 max-w-md w-full rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 transition-all">
          <div className="flex flex-col items-center text-center mb-6">
            {catalog.tenant.logoUrl ? (
              <img
                src={catalog.tenant.logoUrl}
                alt={catalog.tenant.name}
                className="h-20 w-auto rounded-2xl bg-white object-contain shadow-md mb-4 ring-2 ring-zinc-100 dark:ring-zinc-850"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-md mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                {catalog.tenant.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
              Agendamento Online
            </p>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
              {catalog.tenant.name}
            </h1>
          </div>

          {!isNewClient ? (
            <form onSubmit={handleCheckClientPhone} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Para começar, informe seu WhatsApp:
                </h2>
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <input
                  type="text"
                  inputMode="tel"
                  value={clientPhoneE164}
                  onChange={handlePhoneChange}
                  placeholder="+5511999998888"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  required
                  disabled={checkingPhone}
                />
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center font-semibold">
                Formato: +55 + DDD + Número (Sem espaços)
              </p>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  🚨 {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={checkingPhone || clientPhoneE164.length < 14}
                className="w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor, boxShadow: `0 8px 20px -6px ${primaryColor}60` }}
              >
                {checkingPhone ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Identificando...
                  </>
                ) : (
                  "Continuar"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterClient} className="space-y-4">
              <div className="text-center mb-2">
                <span className="inline-block px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                  Primeiro Acesso!
                </span>
                <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Como podemos te chamar?
                </h2>
              </div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu Nome Completo"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-12 pr-4 py-4 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  required
                  minLength={3}
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  🚨 {errorMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewClient(false)}
                  className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 8px 20px -6px ${primaryColor}60` }}
                >
                  Confirmar e Entrar
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    );
  }

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

        <div className="relative z-10 mx-auto flex min-h-[260px] max-w-6xl flex-col justify-end px-4 pb-8 pt-16">
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
                  className="h-28 md:h-36 w-auto min-w-[7rem] max-w-[280px] shrink-0 rounded-[1.5rem] bg-white object-contain shadow-2xl ring-4 ring-white/20"
                />
              ) : (
                <div
                  className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[1.5rem] text-4xl font-black text-white ring-4 ring-white/20 shadow-2xl md:h-36 md:w-36"
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

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold items-center">
              {catalog.stats?.averageRating && catalog.stats.averageRating > 0 ? (
                <span className="flex items-center gap-1 rounded-xl bg-amber-500/25 text-amber-400 px-4 py-2 backdrop-blur-md border border-amber-500/30">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {catalog.stats.averageRating.toFixed(1)}
                </span>
              ) : null}
              {catalog.tenant.publicPhone && (() => {
                const cleanPhone = catalog.tenant.publicPhone.replace(/\D/g, "");
                const waLink = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}`;
                return (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 backdrop-blur-md border border-white/10 transition-all pointer-events-auto text-white hover:scale-105 active:scale-95"
                  >
                    <Phone className="h-3.5 w-3.5 opacity-80" />
                    {catalog.tenant.publicPhone}
                  </a>
                );
              })()}
              {catalog.tenant.instagram && (() => {
                const username = catalog.tenant.instagram.replace("@", "").trim();
                return (
                  <a
                    href={`https://instagram.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 backdrop-blur-md border border-white/10 transition-all pointer-events-auto text-white hover:scale-105 active:scale-95"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 opacity-80"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    {catalog.tenant.instagram}
                  </a>
                );
              })()}
              {catalog.tenant.address && (
                <span className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                  {catalog.tenant.address}
                </span>
              )}
            </div>

            {/* STATS ESTILO UBER */}
            {(catalog.stats?.totalServicesRendered ?? 0) > 0 && (
              <div className="mt-6 flex flex-wrap gap-3 pointer-events-auto">
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md px-5 py-3 border border-white/10">
                  <Scissors className="h-4 w-4 text-white/70" />
                  <span className="text-sm font-black text-white">{catalog.stats!.totalServicesRendered}</span>
                  <span className="text-[10px] font-bold text-white/60 uppercase">serviços realizados</span>
                </div>
                {(catalog.stats?.totalReviews ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("avaliacoes")}
                    className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-3 border border-white/10 transition-all cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 text-white/70" />
                    <span className="text-sm font-black text-white">{catalog.stats!.totalReviews}</span>
                    <span className="text-[10px] font-bold text-white/60 uppercase">avaliações</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TAB NAVIGATION */}
      <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="mx-auto max-w-6xl px-4">
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {([
              { id: "agendamento" as PageTab, label: "Agendamento", icon: <CalendarIcon size={16} /> },
              { id: "reservas" as PageTab, label: "Reservas", icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
              { id: "historico" as PageTab, label: "Histórico", icon: <History size={16} /> },
              { id: "galeria" as PageTab, label: "Galeria", icon: <ImageIcon size={16} /> },
              { id: "avaliacoes" as PageTab, label: "Avaliações", icon: <Star size={16} /> },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-current"
                    : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                style={activeTab === tab.id ? { color: primaryColor, borderColor: primaryColor } : undefined}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {activeTab === "agendamento" && (
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
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                    {catalog?.professionals.map((prof) => {
                      const selected = professionalId === prof.id;
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => setProfessionalId(prof.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer shrink-0 ${
                            selected
                              ? "border-transparent text-white shadow-lg scale-[1.02]"
                              : "border-zinc-150 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                          }`}
                          style={selected ? { backgroundColor: primaryColor, boxShadow: `0 10px 20px -5px ${primaryColor}30` } : undefined}
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 border border-black/10">
                            {prof.imageUrl ? (
                              <img src={prof.imageUrl} alt={prof.name} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-full w-full p-3 text-zinc-400" />
                            )}
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider">
                            {prof.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
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
                      <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">Assinatura validada com sucesso.</h3>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Plano: {activeClubMembership.planName}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase mt-0.5">Plano validado. Vamos verificar os benefícios para o serviço selecionado.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tight">Finalizar</h2>
            <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Confirme seus dados e finalize o agendamento.
            </p>
 
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Card de Cliente Identificado */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight truncate max-w-[150px]">{clientName}</p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-0.5">{clientPhoneE164}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetClient}
                  className="rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 transition-all cursor-pointer shrink-0"
                >
                  Alterar
                </button>
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
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Este serviço será coberto pelo seu clube.</p>
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
                            <p className="text-[10px] font-black text-amber-600 uppercase mt-1">Seu plano ainda pode aplicar desconto de {membershipDiscountPercent}% neste agendamento.</p>
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
                          <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Seu plano pode aplicar desconto de {membershipDiscountPercent}% neste agendamento.</p>
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
      )}

      {/* TAB: RESERVAS */}
      {activeTab === "reservas" && (
        <div className="mx-auto max-w-6xl px-4 py-10 pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ backgroundColor: primaryColor }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tight font-black">Reservas de Produtos</h2>
              <p className="text-xs font-bold text-zinc-500">Faça reservas de produtos e acompanhe seus pedidos</p>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] items-start">
            {/* COLUNA ESQUERDA: PRODUTOS PARA RESERVAR */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                🛍️ Reservar Produtos
              </h3>

              {reserveSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {reserveSuccess}
                </div>
              )}

              {reserveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  🚨 {reserveError}
                </div>
              )}

              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
                </div>
              ) : productsList.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center bg-white dark:bg-zinc-900">
                  <p className="text-sm font-bold text-zinc-500">Nenhum produto disponível para reserva no momento.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateReservation} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {productsList.map((product) => {
                      const qty = selectedProducts[product.id] || 0;
                      return (
                        <div key={product.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 flex flex-col justify-between gap-3">
                          <div className="flex gap-3">
                            {product.imageUrl && (
                              <img src={product.imageUrl} alt={product.name} className="h-16 w-16 object-cover rounded-xl shrink-0" />
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-zinc-900 dark:text-white truncate">{product.name}</h4>
                              <p className="text-xs font-black text-emerald-600 dark:text-emerald-500 mt-1">R$ {(product.price / 100).toFixed(2).replace(".", ",")}</p>
                              <p className="text-[10px] font-bold text-zinc-400 mt-0.5">Estoque: {product.stockQuantity}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Quantidade</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={qty <= 0}
                                onClick={() => setSelectedProducts({ ...selectedProducts, [product.id]: qty - 1 })}
                                className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-black text-zinc-600 dark:text-zinc-400 flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
                              >
                                -
                              </button>
                              <span className="text-xs font-black text-zinc-900 dark:text-white w-6 text-center">{qty}</span>
                              <button
                                type="button"
                                disabled={qty >= product.stockQuantity}
                                onClick={() => setSelectedProducts({ ...selectedProducts, [product.id]: qty + 1 })}
                                className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-black text-zinc-600 dark:text-zinc-400 flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {identified ? (
                    <button
                      type="submit"
                      disabled={reserving || Object.values(selectedProducts).reduce((a, b) => a + b, 0) === 0}
                      className="w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor, boxShadow: `0 8px 20px -6px ${primaryColor}60` }}
                    >
                      {reserving ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Reservando...
                        </>
                      ) : (
                        "Confirmar Reserva"
                      )}
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-4 text-center">
                      <p className="text-xs font-bold text-zinc-500">Identifique-se no topo da página para finalizar a reserva.</p>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* COLUNA DIREITA: MINHAS RESERVAS ANTERIORES */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                📋 Reservas Efetuadas
              </h3>

              {!identified ? (
                <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
                  <p className="text-sm font-bold text-zinc-500">Identifique-se para ver suas reservas anteriores.</p>
                </div>
              ) : loadingReservations ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin h-6 w-6 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center bg-white dark:bg-zinc-900">
                  <p className="text-sm font-bold text-zinc-500">Você ainda não realizou reservas de produtos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((res) => {
                    const resDate = new Date(res.createdAt);
                    const statusLabel: Record<string, { label: string, color: string }> = {
                      PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20" },
                      CONFIRMED: { label: "Confirmada", color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/20" },
                      CANCELED: { label: "Cancelada", color: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20" },
                      PICKED_UP: { label: "Retirada", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20" },
                    };
                    const st = statusLabel[res.status] || { label: res.status, color: "text-zinc-600 bg-zinc-50" };
                    const totalCents = res.items.reduce((acc: number, item: any) => acc + (item.priceAtReservation * item.quantity), 0);

                    return (
                      <div key={res.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${st.color}`}>
                              {st.label}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400">
                              {resDate.toLocaleDateString("pt-BR")}
                            </span>
                          </div>

                          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {res.items.map((item: any) => (
                              <div key={item.id} className="py-1.5 flex items-center justify-between gap-3 text-xs">
                                <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">{item.product.name}</span>
                                <span className="text-zinc-400 font-bold shrink-0">{item.quantity}x R$ {(item.priceAtReservation / 100).toFixed(2).replace(".", ",")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1 flex items-center justify-between text-xs">
                            <span className="text-zinc-500 font-bold">Total</span>
                            <span className="font-black text-zinc-900 dark:text-white">R$ {(totalCents / 100).toFixed(2).replace(".", ",")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: HISTÓRICO */}
      {activeTab === "historico" && (
        <div className="mx-auto max-w-6xl px-4 py-10 pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ backgroundColor: primaryColor }}>
                <History size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tight">Meu Histórico</h2>
                <p className="text-xs font-bold text-zinc-500">Seus agendamentos anteriores</p>
              </div>
            </div>

            {!identified ? (
              <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
                <History className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Identifique-se com seu WhatsApp para ver seu histórico.</p>
              </div>
            ) : loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
              </div>
            ) : historyAppointments.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
                <CalendarIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Você ainda não tem agendamentos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyAppointments.map((appt) => {
                  const st = statusLabels[appt.status] || statusLabels.PENDING;
                  const apptDate = new Date(appt.startAt);
                  const canReview = appt.status === "COMPLETED" && !appt.review;
                  const canCancel = appt.status === "PENDING" || appt.status === "CONFIRMED";
                  return (
                    <div key={appt.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 transition-all hover:shadow-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-zinc-900 dark:text-white truncate">{appt.service.name}</h3>
                          <p className="text-xs font-bold text-zinc-500 mt-1">
                            {appt.professional.name} • {apptDate.toLocaleDateString("pt-BR")} às {apptDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs font-black text-zinc-400 mt-1">
                            R$ {(appt.service.price / 100).toFixed(2).replace(".", ",")} • {appt.service.durationMin} min
                          </p>
                        </div>
                        {canReview && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewAppointmentId(appt.id);
                              setActiveTab("avaliacoes");
                            }}
                            className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Star size={12} />
                            Avaliar
                          </button>
                        )}
                        {appt.review && (
                          <span className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                            <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Avaliado</span>
                          </span>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: GALERIA */}
      {activeTab === "galeria" && (
        <div className="mx-auto max-w-6xl px-4 py-10 pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ backgroundColor: primaryColor }}>
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tight font-black">Galeria</h2>
              <p className="text-xs font-bold text-zinc-500">Nossos cortes e trabalhos recentes</p>
            </div>
          </div>

          {loadingGallery ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
            </div>
          ) : galleryPhotos.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-12 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
              <ImageIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Nenhuma foto adicionada na galeria ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxImage(photo.imageUrl)}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || "Foto da galeria"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
                      <p className="text-[10px] font-bold text-white truncate">{photo.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: AVALIAÇÕES */}
      {activeTab === "avaliacoes" && (
        <div className="mx-auto max-w-6xl px-4 py-10 pb-24">
          
          {/* STATS CARD */}
          <div className="mb-10 rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Nota média grande */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-6xl font-black text-zinc-900 dark:text-white leading-none">
                  {(catalog.stats?.averageRating ?? 0) > 0 ? catalog.stats!.averageRating.toFixed(1) : "—"}
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i <= Math.round(catalog.stats?.averageRating ?? 0)
                          ? "text-amber-400 fill-amber-400"
                          : "text-zinc-200 dark:text-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  {catalog.stats?.totalReviews ?? 0} avaliações
                </p>
              </div>

              {/* Barras de distribuição */}
              <div className="flex-1 w-full space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => r.rating === star).length;
                  const total = reviews.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs font-black text-zinc-500 w-3">{star}</span>
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: primaryColor }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Stats extras */}
              <div className="flex flex-col gap-3 text-center sm:text-right">
                <div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">{catalog.stats?.totalServicesRendered ?? 0}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Serviços Realizados</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            
            {/* COLUNA ESQUERDA: REVIEWS */}
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <MessageSquare size={18} style={{ color: primaryColor }} />
                O que dizem nossos clientes
              </h2>

              {loadingReviews ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm font-bold text-zinc-500">Nenhuma avaliação ainda. Seja o primeiro!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 transition-all hover:shadow-lg">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {review.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-sm font-black text-zinc-900 dark:text-white truncate">{review.clientName}</h4>
                            <span className="text-[10px] font-bold text-zinc-400 shrink-0">{formatRelativeDate(review.createdAt)}</span>
                          </div>
                          <div className="flex gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i <= review.rating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-zinc-200 dark:text-zinc-700"
                                }`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: FORMULÁRIO DE REVIEW */}
            <div className="space-y-8">
              {/* FORMULÁRIO DE AVALIAÇÃO */}
              {identified && (
                <div className="rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                    <Send size={14} style={{ color: primaryColor }} />
                    Deixe sua avaliação
                  </h3>

                  {reviewSuccess && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                      {reviewSuccess}
                    </div>
                  )}

                  {reviewError && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                      🚨 {reviewError}
                    </div>
                  )}

                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    {/* Selecionar agendamento */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        Agendamento
                      </label>
                      <select
                        value={reviewAppointmentId}
                        onChange={(e) => setReviewAppointmentId(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all cursor-pointer"
                      >
                        <option value="">Selecione um agendamento concluído...</option>
                        {historyAppointments
                          .filter((a) => a.status === "COMPLETED" && !a.review)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.service.name} — {new Date(a.startAt).toLocaleDateString("pt-BR")} — {a.professional.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Estrelas */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        Nota
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReviewRating(i)}
                            onMouseEnter={() => setReviewHover(i)}
                            onMouseLeave={() => setReviewHover(0)}
                            className="p-1 transition-transform hover:scale-125 cursor-pointer"
                          >
                            <Star
                              className={`h-8 w-8 transition-colors ${
                                i <= (reviewHover || reviewRating)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-zinc-200 dark:text-zinc-700"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comentário */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        Comentário (opcional)
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Conte como foi sua experiência..."
                        rows={3}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview || !reviewAppointmentId || reviewRating < 1}
                      className="w-full rounded-xl py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor, boxShadow: `0 8px 20px -6px ${primaryColor}60` }}
                    >
                      {submittingReview ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Enviar Avaliação
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {!identified && (
                <div className="rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 text-center">
                  <Star className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm font-bold text-zinc-500">Identifique-se para deixar uma avaliação.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxImage}
            alt="Foto ampliada"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </main>
  );
}