"use client";

import { useEffect, useState } from "react";
import {
  Package,
  PlusCircle,
  Save,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Info,
  Layers,
  Upload,
  Calendar,
  ShoppingBag,
  User,
  Phone
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  active: boolean;
  imageUrl: string | null;
};

type ReservationItem = {
  id: string;
  quantity: number;
  priceAtReservation: number;
  product: {
    name: string;
    imageUrl: string | null;
  };
};

type Reservation = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "PICKED_UP";
  createdAt: string;
  client: {
    name: string;
    phoneE164: string;
  };
  items: ReservationItem[];
};

function centsToBRL(cents: number) {
  return (cents / 100).toFixed(2);
}

function brlToCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  const number = Number(normalized);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100);
}

function formatDateBR(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "ACTIVE":
    case "PICKED_UP":
      return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-950 dark:bg-amber-500/15 dark:text-amber-400";
    case "CANCELED":
    case "EXPIRED":
      return "border-red-200 bg-red-100 text-red-700 dark:border-red-950 dark:bg-red-500/15 dark:text-red-400";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

export default function ProductsClient({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<"products" | "reservations">("products");
  
  // Estados de dados
  const [products, setProducts] = useState<Product[]>([]);
  const [planTier, setPlanTier] = useState<string>("PRO");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Mensagens
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Formulário de Criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("50.00");
  const [newStock, setNewStock] = useState("10");
  const [newActive, setNewActive] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  // Estado de Edição (Inline para simplificar)
  const [editRows, setEditRows] = useState<
    Record<string, { name: string; description: string; price: string; stockQuantity: string; active: boolean; imageUrl: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Carregar produtos
  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/admin/${slug}/products`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar produtos");
      setProducts(data.products || []);
      if (data.planTier) {
        setPlanTier(data.planTier);
      }

      const rows: any = {};
      for (const prod of data.products || []) {
        rows[prod.id] = {
          name: prod.name,
          description: prod.description || "",
          price: centsToBRL(prod.price),
          stockQuantity: String(prod.stockQuantity),
          active: prod.active,
          imageUrl: prod.imageUrl || "",
        };
      }
      setEditRows(rows);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    }
  };

  // Carregar Reservas
  const loadReservations = async () => {
    try {
      const res = await fetch(`/api/admin/${slug}/products/reservations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar reservas");
      setReservations(data.reservations || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    }
  };

  // Carregar tudo inicialmente
  const loadAll = async () => {
    setLoading(true);
    setErrorMessage("");
    await Promise.all([loadProducts(), loadReservations()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [slug]);

  // Upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isForNewProduct: boolean, editProdId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/${slug}/products/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro no upload.");

      if (isForNewProduct) {
        setNewImageUrl(data.url);
      } else if (editProdId) {
        setEditRows(c => ({
          ...c,
          [editProdId]: {
            ...c[editProdId],
            imageUrl: data.url
          }
        }));
      }
      setSuccessMessage("Imagem carregada com sucesso!");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao carregar imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Criar Produto
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCreate(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          price: brlToCents(newPrice),
          stockQuantity: Number(newStock),
          active: newActive,
          imageUrl: newImageUrl || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar produto.");

      setSuccessMessage("Produto cadastrado com sucesso.");
      setNewName("");
      setNewDescription("");
      setNewPrice("50.00");
      setNewStock("10");
      setNewActive(true);
      setNewImageUrl("");
      setShowCreateModal(false);
      await loadProducts();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao cadastrar.");
    } finally {
      setSavingCreate(false);
    }
  };

  // Salvar Edição de Produto
  const handleSaveProduct = async (id: string) => {
    try {
      setSavingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const row = editRows[id];
      const res = await fetch(`/api/admin/${slug}/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          description: row.description,
          price: brlToCents(row.price),
          stockQuantity: Number(row.stockQuantity),
          active: row.active,
          imageUrl: row.imageUrl || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao salvar alterações.");

      setSuccessMessage("Produto atualizado com sucesso.");
      await loadProducts();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao salvar.");
    } finally {
      setSavingId(null);
    }
  };

  // Excluir Produto
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este produto?")) return;
    try {
      setSavingId(id);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/admin/${slug}/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao excluir produto.");

      setSuccessMessage("Produto excluído com sucesso.");
      await loadProducts();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao excluir.");
    } finally {
      setSavingId(null);
    }
  };

  // Alterar Status da Reserva
  const handleUpdateReservationStatus = async (resId: string, newStatus: string) => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      const res = await fetch(`/api/admin/${slug}/products/reservations/${resId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao atualizar status da reserva.");

      setSuccessMessage("Status da reserva atualizado com sucesso!");
      await loadAll();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao atualizar status.");
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-bold">
        <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
        Carregando estoque e reservas...
      </div>
    );
  }

  if (planTier === "BASICO") {
    return (
      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 text-center mt-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-zinc-950 text-[10px] font-black px-5 py-1.5 rounded-bl-2xl uppercase tracking-widest">
            Funcionalidade Premium
          </div>
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
              <Package size={32} />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase mb-4">
            Controle de Estoque não disponível
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto mb-8 font-semibold">
            O plano <span className="text-emerald-400">Trato Básico</span> não possui controle de estoque e reserva de produtos. Faça um upgrade para o plano <span className="text-emerald-400">Trato Essencial</span> ou <span className="text-emerald-400">Trato Pro</span> para gerenciar seus produtos!
          </p>
          <a
            href={`/admin/${slug}/billing`}
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/10"
          >
            Fazer Upgrade do Plano
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 p-4">
      {/* HEADER */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-xs">
            <Package className="h-4 w-4" />
            Inventário
          </div>
          <h1 className="mt-2 text-4xl font-black text-zinc-900 dark:text-white italic">Gestão de Estoque</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 font-medium">
            Cadastre os produtos da barbearia e gerencie as reservas dos clientes.
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={`/admin/${slug}`}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para agenda
          </a>
        </div>
      </div>

      {/* FEEDBACKS */}
      {(errorMessage || successMessage) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
          errorMessage 
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400" 
            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
        }`}>
          {errorMessage || successMessage}
        </div>
      )}

      {/* TABS MENU */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-4 text-sm font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === "products"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Produtos em Estoque
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`pb-4 text-sm font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === "reservations"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          Reservas de Clientes
        </button>
      </div>

      {/* TAB PRODUTOS */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-xs cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              Novo Produto
            </button>
          </div>

          {/* LISTAGEM DE PRODUTOS */}
          <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
            {!products.length ? (
              <div className="p-10 text-center text-zinc-500 italic font-medium">Nenhum produto cadastrado ainda.</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {products.map((prod) => {
                  const row = editRows[prod.id];
                  if (!row) return null;

                  return (
                    <div
                      key={prod.id}
                      className="flex flex-col gap-4 p-5 border-b border-zinc-100 dark:border-zinc-800 md:grid md:grid-cols-[80px_1.5fr_1fr_100px_80px_auto] md:gap-6 md:px-8 md:py-6 md:items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                    >
                      {/* Bloco 1: Imagem + Nome/Desc (Lado a Lado no Mobile) */}
                      <div className="flex items-center gap-4 w-full md:contents">
                        {/* Imagem do Produto */}
                        <div className="relative group shrink-0">
                          {row.imageUrl ? (
                            <img src={row.imageUrl} alt={row.name} className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-100" />
                          ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                              <ShoppingBag size={20} />
                            </div>
                          )}
                          <label className="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                            <Upload size={14} />
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false, prod.id)} className="hidden" />
                          </label>
                        </div>

                        {/* Nome & Descrição */}
                        <div className="flex-1 space-y-1.5 w-full">
                          <label className="block text-[10px] font-black uppercase text-zinc-400">Produto / Descrição</label>
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => setEditRows(c => ({...c, [prod.id]: {...c[prod.id], name: e.target.value}}))}
                            className="w-full rounded-xl border border-transparent bg-zinc-100 dark:bg-zinc-800 p-2.5 text-sm font-bold text-zinc-900 dark:text-white focus:ring-1 ring-emerald-500 outline-none"
                          />
                          <input
                            type="text"
                            value={row.description}
                            placeholder="Sem descrição"
                            onChange={(e) => setEditRows(c => ({...c, [prod.id]: {...c[prod.id], description: e.target.value}}))}
                            className="w-full rounded-xl border border-transparent bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-500 font-bold focus:ring-1 ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Bloco 2: Preço + Estoque (Lado a Lado no Mobile) */}
                      <div className="grid grid-cols-2 gap-4 w-full md:contents">
                        {/* Preço (R$) */}
                        <div className="w-full">
                          <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Preço (R$)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                            <input
                              type="text"
                              value={row.price}
                              onChange={(e) => setEditRows(c => ({...c, [prod.id]: {...c[prod.id], price: e.target.value}}))}
                              className="w-full rounded-xl border border-transparent bg-zinc-100 dark:bg-zinc-800 pl-8 pr-3 py-2.5 text-sm font-bold text-zinc-900 dark:text-white focus:ring-1 ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Quantidade em Estoque */}
                        <div className="w-full">
                          <label className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Estoque</label>
                          <input
                            type="number"
                            value={row.stockQuantity}
                            onChange={(e) => setEditRows(c => ({...c, [prod.id]: {...c[prod.id], stockQuantity: e.target.value}}))}
                            className="w-full rounded-xl border border-transparent bg-zinc-100 dark:bg-zinc-800 p-2.5 text-sm font-bold text-zinc-900 dark:text-white focus:ring-1 ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Bloco 3: Status + Ações (Rodapé do Card no Mobile) */}
                      <div className="flex items-center justify-between gap-4 w-full md:contents pt-3 md:pt-0 border-t border-zinc-100 dark:border-zinc-800 md:border-t-0">
                        {/* Ativo/Inativo */}
                        <div className="flex items-center gap-3 md:flex-col md:items-center md:gap-1">
                          <label className="block text-[10px] font-black uppercase text-zinc-400 md:mb-1">Status</label>
                          <button
                            type="button"
                            onClick={() => setEditRows(c => ({...c, [prod.id]: {...c[prod.id], active: !c[prod.id].active}}))}
                            className="transition-transform active:scale-90 cursor-pointer"
                          >
                            {row.active ? (
                              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                            ) : (
                              <XCircle className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
                            )}
                          </button>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveProduct(prod.id)}
                            disabled={savingId === prod.id}
                            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-3 text-xs font-black uppercase tracking-widest text-white dark:text-zinc-900 hover:opacity-80 transition shadow-md cursor-pointer"
                          >
                            <Save className="h-4 w-4" />
                            {savingId === prod.id ? "..." : "Salvar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id)}
                            disabled={savingId === prod.id}
                            className="p-3 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-transparent"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* MODAL DE CRIAÇÃO */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black italic text-zinc-900 dark:text-white">Novo Produto</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase mt-1">Cadastre um produto para o catálogo</p>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">
                    <XCircle size={24} />
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="space-y-4">
                  {/* Foto do produto */}
                  <div className="flex items-center gap-4">
                    {newImageUrl ? (
                      <img src={newImageUrl} alt="Novo produto" className="w-16 h-16 rounded-xl object-cover bg-zinc-100 border border-zinc-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 border rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition text-xs font-black uppercase tracking-wider cursor-pointer">
                      <Upload size={14} />
                      {uploadingImage ? "Enviando..." : "Subir Foto"}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-zinc-500">Nome do Produto</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Pomada Modeladora"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-zinc-500">Descrição</label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Ex: Fixação forte com efeito mate"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase text-zinc-500">Preço (R$)</label>
                      <input
                        type="text"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase text-zinc-500">Estoque Inicial</label>
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingCreate}
                    className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {savingCreate ? "Cadastrando..." : "Cadastrar Produto"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB RESERVAS */}
      {activeTab === "reservations" && (
        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 dark:shadow-none">
            {!reservations.length ? (
              <div className="p-10 text-center text-zinc-500 italic font-medium">Nenhuma reserva encontrada.</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {reservations.map((res) => {
                  const total = res.items.reduce((sum, item) => sum + item.priceAtReservation * item.quantity, 0);
                  return (
                    <div key={res.id} className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      
                      {/* Info Cliente & Itens */}
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reserva: {res.id.slice(-8).toUpperCase()}</span>
                          <span className="text-xs text-zinc-400 font-bold">•</span>
                          <span className="text-xs text-zinc-400 font-bold">{formatDateBR(res.createdAt)}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-base">
                            <User size={16} className="text-emerald-500" />
                            {res.client.name}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                            <Phone size={14} />
                            {res.client.phoneE164}
                          </div>
                        </div>

                        {/* Lista de itens */}
                        <div className="space-y-1.5 pl-6 border-l-2 border-emerald-500/20">
                          {res.items.map((item) => (
                            <div key={item.id} className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                              {item.product.name} <span className="text-zinc-400">x{item.quantity}</span> — {formatCurrency(item.priceAtReservation)} /un
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totais & Status Dropdown */}
                      <div className="flex flex-col md:items-end justify-between shrink-0 gap-4">
                        <div className="md:text-right">
                          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Total da Reserva</span>
                          <h4 className="text-xl font-black italic text-zinc-900 dark:text-white mt-1">{formatCurrency(total)}</h4>
                        </div>

                        <div className="space-y-2 w-full md:w-auto">
                          <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">Status da Reserva</label>
                          <select
                            value={res.status}
                            onChange={(e) => handleUpdateReservationStatus(res.id, e.target.value)}
                            className={`w-full md:w-48 appearance-none rounded-xl border p-3.5 text-xs font-black uppercase tracking-wider text-center outline-none cursor-pointer transition-colors ${statusBadgeClass(res.status)}`}
                          >
                            <option value="PENDING">Pendente</option>
                            <option value="CONFIRMED">Confirmada</option>
                            <option value="PICKED_UP">Retirado / Entregue</option>
                            <option value="CANCELED">Cancelada (Devolve Estoque)</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
