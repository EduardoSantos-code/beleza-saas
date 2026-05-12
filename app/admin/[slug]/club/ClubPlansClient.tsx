"use client";

import React, { useState } from "react";
import { 
  Crown, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  ChevronRight
} from "lucide-react";

type ClubTenant = {
  id: string;
  name: string;
  slug: string;
  clubEnabled: boolean;
  clubPaymentProvider: "ASAAS" | "MERCADO_PAGO" | null;
};

type ClubPlan = {
  id: string;
  name: string;
  description: string | null;
  terms: string | null;
  priceInCents: number;
  billingCycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY";
  discountPercent: number | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Props = {
  slug: string;
  initialTenant: ClubTenant;
  initialPlans: ClubPlan[];
};

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

const formatCycle = (cycle: string) => {
  const cycles: Record<string, string> = {
    MONTHLY: "Mensal",
    QUARTERLY: "Trimestral",
    SEMIANNUAL: "Semestral",
    YEARLY: "Anual",
  };
  return cycles[cycle] || cycle;
};

const parseCurrencyToCents = (value: string) => {
  const cleanValue = value.replace(/\D/g, "");
  return parseInt(cleanValue || "0", 10);
};

export default function ClubPlansClient({ slug, initialTenant, initialPlans }: Props) {
  const [plans, setPlans] = useState<ClubPlan[]>(initialPlans);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ClubPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    billingCycle: "MONTHLY",
    discountPercent: "",
    description: "",
    terms: "",
    isActive: true,
  });

  const handleOpenForm = (plan?: ClubPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: (plan.priceInCents / 100).toString(),
        billingCycle: plan.billingCycle,
        discountPercent: plan.discountPercent?.toString() || "",
        description: plan.description || "",
        terms: plan.terms || "",
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        price: "",
        billingCycle: "MONTHLY",
        discountPercent: "",
        description: "",
        terms: "",
        isActive: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const payload = {
      ...formData,
      priceInCents: Math.round(parseFloat(formData.price.replace(",", ".")) * 100),
      discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
    };

    try {
      const url = editingPlan 
        ? `/api/admin/${slug}/club/plans/${editingPlan.id}`
        : `/api/admin/${slug}/club/plans`;
      
      const res = await fetch(url, {
        method: editingPlan ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar plano");

      const savedPlan = await res.json();

      if (editingPlan) {
        setPlans(plans.map(p => p.id === savedPlan.id ? savedPlan : p));
        setMessage("Plano salvo com sucesso.");
        setError(null);
      } else {
        setPlans([savedPlan, ...plans]);
        setMessage("Plano salvo com sucesso.");
        setError(null);
      }
      setIsFormOpen(false);
    } catch (err) {
      setError("Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja desativar este plano?")) return;
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/${slug}/club/plans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      
      setPlans(plans.map(p => p.id === id ? { ...p, isActive: false } : p));
      setMessage("Plano desativado com sucesso.");
      setError(null);
    } catch (err) {
      setError("Não foi possível concluir a ação.");
      setMessage(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="text-amber-500" /> Clube de Assinaturas
          </h1>
          <p className="text-muted-foreground text-sm">
            Crie planos para seus clientes assinarem e usarem benefícios na barbearia.
          </p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all"
        >
          <Plus size={18} /> Novo plano
        </button>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-card flex items-center gap-4">
          <div className={`p-2 rounded-full ${initialTenant.clubEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {initialTenant.clubEnabled ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Status do Clube</p>
            <p className="font-semibold">{initialTenant.clubEnabled ? "Ativo" : "Inativo"}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-card flex items-center gap-4">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Gateway de Pagamento</p>
            <p className="font-semibold">{initialTenant.clubPaymentProvider || "Não configurado"}</p>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Form Section */}
      {isFormOpen && (
        <div className="bg-card border rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold mb-4">{editingPlan ? "Editar Plano" : "Novo Plano"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome do Plano</label>
                <input 
                  required
                  className="w-full p-2 rounded-md border bg-background"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Plano VIP Mensal"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Preço (R$)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  className="w-full p-2 rounded-md border bg-background"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ciclo de Cobrança</label>
                <select 
                  className="w-full p-2 rounded-md border bg-background"
                  value={formData.billingCycle}
                  onChange={e => setFormData({...formData, billingCycle: e.target.value})}
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Desconto em Serviços (%)</label>
                <input 
                  type="number"
                  className="w-full p-2 rounded-md border bg-background"
                  value={formData.discountPercent}
                  onChange={e => setFormData({...formData, discountPercent: e.target.value})}
                  placeholder="Ex: 10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição / Benefícios</label>
              <textarea 
                className="w-full p-2 rounded-md border bg-background min-h-[80px]"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="O que o cliente ganha assinando este plano?"
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isActive"
                checked={formData.isActive}
                onChange={e => setFormData({...formData, isActive: e.target.checked})}
              />
              <label htmlFor="isActive" className="text-sm font-medium">Plano Ativo</label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent"
              >
                Cancelar
              </button>
              <button 
                disabled={isLoading}
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                Salvar Plano
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Crown size={32} className="text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg">Nenhum plano criado ainda</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Crie seu primeiro plano para exibir o clube na página pública.
            </p>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className={`relative group p-5 rounded-2xl border bg-card transition-all hover:shadow-md ${!plan.isActive ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              {!plan.isActive && (
                <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Inativo
                </span>
              )}
              <div className="mb-4">
                <h3 className="font-bold text-lg leading-tight">{plan.name}</h3>
                <p className="text-2xl font-black mt-1">{formatCurrency(plan.priceInCents)}<span className="text-xs font-normal text-muted-foreground">/{formatCycle(plan.billingCycle).toLowerCase()}</span></p>
              </div>
              
              {plan.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{plan.description}</p>
              )}

              <div className="space-y-2 mb-6">
                {plan.discountPercent && (
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <CheckCircle2 size={14} /> {plan.discountPercent}% de desconto em serviços
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <button 
                  onClick={() => handleOpenForm(plan)}
                  className="flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Pencil size={14} /> Editar
                </button>
                {plan.isActive && (
                  <button 
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} /> Desativar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}