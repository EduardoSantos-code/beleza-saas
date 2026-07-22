"use client";

import { useEffect, useState } from "react";
import { UserPlus, Save, Trash2, User, Phone, CheckCircle2, XCircle, Mail, Shield, UserCheck, AlertTriangle } from "lucide-react";

export default function ProfessionalsClient({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<"professionals" | "logins">("professionals");
  
  // --- Estados de Profissionais ---
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editRows, setEditRows] = useState<Record<string, any>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+55");
  const [newCommissionRate, setNewCommissionRate] = useState(50);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // --- Estados de Membros / Logins ---
  const [members, setMembers] = useState<any[]>([]);
  const [memberProfessionals, setMemberProfessionals] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Estados do formulário de convite
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "STAFF">("STAFF");
  const [inviteProfessionalId, setInviteProfessionalId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [simulatedLink, setSimulatedLink] = useState<string | null>(null);

  // Estados locais para edição dos membros na listagem
  const [editMembers, setEditMembers] = useState<Record<string, { role: "MANAGER" | "STAFF"; linkedProfessionalId: string }>>({});

  // --- Funções de Upload ---
  async function handleNewImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingNew(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/${slug}/professionals/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao fazer upload");
      }

      const data = await res.json();
      setNewImageUrl(data.url);
    } catch (err: any) {
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setUploadingNew(false);
    }
  }

  async function handleRowImageUpload(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/${slug}/professionals/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao fazer upload");
      }

      const data = await res.json();
      setEditRows((prev) => ({
        ...prev,
        [id]: { ...prev[id], imageUrl: data.url },
      }));
    } catch (err: any) {
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setUploadingId(null);
    }
  }

  // --- Funções de Profissionais ---
  async function loadProfessionals() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${slug}/professionals`);
      const json = await res.json();
      setData(json);
      
      const rows: any = {};
      json.professionals.forEach((p: any) => {
        rows[p.id] = { 
          name: p.name, 
          phoneE164: p.phoneE164 || "+55", 
          active: p.active, 
          commissionRate: p.commissionRate ?? 50,
          imageUrl: p.imageUrl || ""
        };
      });
      setEditRows(rows);
    } catch (err) {
      console.error("Erro ao carregar profissionais:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return alert("O nome é obrigatório");

    try {
      setCreating(true);
      const res = await fetch(`/api/admin/${slug}/professionals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newName, 
          phoneE164: newPhone, 
          commissionRate: newCommissionRate,
          imageUrl: newImageUrl || undefined 
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewPhone("+55");
        setNewCommissionRate(50);
        setNewImageUrl("");
        loadProfessionals();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Erro ao criar profissional");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveProfessional(id: string) {
    try {
      setSavingId(id);
      const row = editRows[id];
      const res = await fetch(`/api/admin/${slug}/professionals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao salvar alterações.");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao salvar profissional");
    } finally {
      setSavingId(null);
      loadProfessionals();
    }
  }

  async function handleDeleteProfessional(id: string) {
    if (!confirm("Tem certeza? Isso pode afetar agendamentos antigos.")) return;
    await fetch(`/api/admin/${slug}/professionals/${id}`, { method: "DELETE" });
    loadProfessionals();
  }

  // --- Funções de Membros / Logins ---
  async function loadMembers() {
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/admin/${slug}/members`);
      const json = await res.json();
      if (res.ok) {
        setMembers(json.members || []);
        setMemberProfessionals(json.professionals || []);
        
        // Inicializar os campos editáveis locais dos membros
        const localEditState: Record<string, { role: "MANAGER" | "STAFF"; linkedProfessionalId: string }> = {};
        json.members.forEach((m: any) => {
          localEditState[m.id] = {
            role: m.role,
            linkedProfessionalId: m.linkedProfessionalId || "",
          };
        });
        setEditMembers(localEditState);
      }
    } catch (err) {
      console.error("Erro ao carregar logins:", err);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteName || !inviteEmail) {
      return alert("Nome e e-mail são obrigatórios.");
    }

    try {
      setInviting(true);
      setSimulatedLink(null);
      const res = await fetch(`/api/admin/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          professionalId: inviteProfessionalId || null,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setInviteName("");
        setInviteEmail("");
        setInviteRole("STAFF");
        setInviteProfessionalId("");
        
        loadMembers();
        
        if (json.mockLink) {
          setSimulatedLink(json.mockLink);
        } else {
          alert("Acesso configurado e enviado por e-mail!");
        }
      } else {
        alert(json.error || "Erro ao convidar colaborador.");
      }
    } catch (err) {
      console.error("Erro ao convidar:", err);
    } finally {
      setInviting(false);
    }
  }

  async function handleSaveMember(membershipId: string) {
    try {
      setSavingMemberId(membershipId);
      const localState = editMembers[membershipId];
      
      const res = await fetch(`/api/admin/${slug}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId,
          role: localState.role,
          professionalId: localState.linkedProfessionalId || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao atualizar acesso.");
      }

      alert("Acesso atualizado com sucesso!");
      loadMembers();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar alterações.");
    } finally {
      setSavingMemberId(null);
    }
  }

  async function handleDeleteMember(membershipId: string) {
    if (!confirm("Revogar acesso deste usuário? O login dele continuará ativo, mas ele perderá o acesso a esta barbearia.")) return;
    try {
      const res = await fetch(`/api/admin/${slug}/members?membershipId=${membershipId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadMembers();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Erro ao revogar acesso.");
      }
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  }

  // --- Effects ---
  useEffect(() => {
    loadProfessionals();
  }, [slug]);

  useEffect(() => {
    if (activeTab === "logins") {
      loadMembers();
    }
  }, [activeTab]);

  return (
    <div className="space-y-10 max-w-5xl mx-auto p-4 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Administração</p>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white italic tracking-tight uppercase">Equipe e Acessos</h1>
        </div>
        
        {/* TABS SELECTOR */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 self-start">
          <button
            onClick={() => setActiveTab("professionals")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "professionals"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            💈 Profissionais
          </button>
          <button
            onClick={() => setActiveTab("logins")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "logins"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            🔒 Logins e Acessos
          </button>
        </div>
      </div>

      {/* RENDER VIEW: PROFESSIONALS */}
      {activeTab === "professionals" && (
        <div className="space-y-10">
          {/* SEÇÃO: ADICIONAR NOVO PROFISSIONAL */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-500">
              <UserPlus className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Novo Profissional</h2>
            </div>
            
            <form onSubmit={handleCreateProfessional} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              {/* Foto de Perfil */}
              <div className="md:col-span-2 flex flex-col items-center justify-center gap-2">
                <div className="relative h-20 w-20 rounded-full bg-zinc-50 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-inner">
                  {newImageUrl ? (
                    <img src={newImageUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-zinc-400" />
                  )}
                  {uploadingNew && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors">
                  Carregar Foto
                  <input type="file" accept="image/*" onChange={handleNewImageUpload} className="hidden" />
                </label>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                    placeholder="Ex: João Silva"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="md:col-span-3">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                    placeholder="+55..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Comissão (%)</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(Number(e.target.value))}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={creating}
                className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {creating ? "Criando..." : "Adicionar"}
              </button>
            </form>
          </section>

          {/* LISTAGEM DE PROFISSIONAIS */}
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest px-1">Profissionais Cadastrados</h2>
            
            {loading ? (
              <div className="p-10 flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                Carregando profissionais...
              </div>
            ) : data?.professionals.length === 0 ? (
              <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800">
                <p className="text-zinc-500 text-sm italic">Sua equipe está vazia. Adicione o primeiro profissional acima.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {data?.professionals.map((p: any) => (
                  <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-6 items-center transition-all hover:border-emerald-500/30">
                    
                    {/* Foto de Perfil */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="relative h-16 w-16 rounded-full bg-zinc-50 dark:bg-zinc-800 overflow-hidden border border-zinc-150 dark:border-zinc-700 flex items-center justify-center shadow-inner">
                        {editRows[p.id]?.imageUrl ? (
                          <img src={editRows[p.id]?.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-zinc-400" />
                        )}
                        {uploadingId === p.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors">
                        Alterar
                        <input type="file" accept="image/*" onChange={(e) => handleRowImageUpload(e, p.id)} className="hidden" />
                      </label>
                    </div>

                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">Nome</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium focus:ring-1 ring-emerald-500 outline-none"
                          value={editRows[p.id]?.name}
                          onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], name: e.target.value}})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">WhatsApp</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium focus:ring-1 ring-emerald-500 outline-none"
                          value={editRows[p.id]?.phoneE164}
                          onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], phoneE164: e.target.value}})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">Comissão (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-medium focus:ring-1 ring-emerald-500 outline-none"
                          value={editRows[p.id]?.commissionRate}
                          onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], commissionRate: Number(e.target.value)}})}
                        />
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={editRows[p.id]?.active}
                          onChange={(e) => setEditRows({...editRows, [p.id]: {...editRows[p.id], active: e.target.checked}})}
                        />
                        {editRows[p.id]?.active ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-zinc-400" />
                        )}
                        <span className={`text-sm font-bold ${editRows[p.id]?.active ? 'text-emerald-600' : 'text-zinc-500'}`}>
                          {editRows[p.id]?.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleSaveProfessional(p.id)}
                        disabled={savingId === p.id}
                        className="flex-1 md:flex-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl font-bold text-sm transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {savingId === p.id ? "..." : "Salvar"}
                      </button>
                      <button 
                        onClick={() => handleDeleteProfessional(p.id)}
                        className="p-2.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: LOGINS & ACCESSES */}
      {activeTab === "logins" && (
        <div className="space-y-10">
          
          {/* AVISO DO CONVITE SIMULADO (MODO DESENVOLVIMENTO) */}
          {simulatedLink && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500/50 p-6 rounded-3xl space-y-4 animate-pulse">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <h3 className="font-extrabold text-lg">Convite Criado com Sucesso!</h3>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                Como estamos em modo de desenvolvimento local sem chave do <strong>Resend API</strong> configurada, simulamos o e-mail enviado ao colaborador. Clique no link abaixo para configurar a senha do novo funcionário:
              </p>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                <a 
                  href={simulatedLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                >
                  {simulatedLink}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(simulatedLink);
                    alert("Link copiado!");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Copiar Link
                </button>
              </div>
              <button
                onClick={() => setSimulatedLink(null)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Fechar aviso
              </button>
            </div>
          )}

          {/* SEÇÃO: CONVIDAR NOVO MEMBRO */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-500">
              <Mail className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">Enviar Convite de Acesso</h2>
            </div>

            <form onSubmit={handleInviteMember} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-3">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                    placeholder="Ex: Carlos Santos"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">E-mail de Login</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 ring-emerald-500 outline-none transition-all"
                    placeholder="carlos@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Cargo / Nível</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 ring-emerald-500 outline-none transition-all"
                  >
                    <option value="STAFF">Funcionário</option>
                    <option value="MANAGER">Gerente</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-black mb-2 block">Vincular Profissional</label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <select
                    value={inviteProfessionalId}
                    onChange={(e) => setInviteProfessionalId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 ring-emerald-500 outline-none transition-all"
                  >
                    <option value="">Nenhum (Administrativo)</option>
                    {memberProfessionals.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={inviting}
                className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {inviting ? "Enviando..." : "Convidar"}
              </button>
            </form>
          </section>

          {/* LISTAGEM DE ACESSOS */}
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase text-zinc-500 tracking-widest px-1">Logins Cadastrados</h2>

            {loadingMembers ? (
              <div className="p-10 flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                Carregando acessos...
              </div>
            ) : members.length === 0 ? (
              <p className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl text-zinc-500 text-sm italic border border-zinc-250 dark:border-zinc-850">
                Nenhum login cadastrado.
              </p>
            ) : (
              <div className="grid gap-4">
                {members.map((m: any) => {
                  const localState = editMembers[m.id] || { role: m.role, linkedProfessionalId: m.linkedProfessionalId || "" };
                  const isOwner = m.role === "OWNER";
                  
                  return (
                    <div key={m.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-6 items-center hover:border-emerald-500/20 transition">
                      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        {/* Nome & Email */}
                        <div className="space-y-1">
                          <p className="font-extrabold text-zinc-900 dark:text-white uppercase text-sm">{m.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{m.email}</p>
                        </div>

                        {/* Nível / Cargo Dropdown */}
                        <div>
                          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">Nível de Acesso</label>
                          {isOwner ? (
                            <span className="inline-block bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                              👑 Proprietário
                            </span>
                          ) : (
                            <select
                              value={localState.role}
                              onChange={(e) => setEditMembers({
                                ...editMembers,
                                [m.id]: { ...localState, role: e.target.value as any }
                              })}
                              className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-semibold text-xs focus:ring-1 ring-emerald-500 outline-none"
                            >
                              <option value="STAFF">Funcionário (Apenas Agenda, Clientes e Métricas)</option>
                              <option value="MANAGER">Gerente (Acesso Administrativo)</option>
                            </select>
                          )}
                        </div>

                        {/* Profissional Vinculado Dropdown */}
                        <div>
                          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-black mb-1 block">Profissional Vinculado</label>
                          <select
                            value={localState.linkedProfessionalId}
                            onChange={(e) => setEditMembers({
                              ...editMembers,
                              [m.id]: { ...localState, linkedProfessionalId: e.target.value }
                            })}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white font-semibold text-xs focus:ring-1 ring-emerald-500 outline-none"
                          >
                            <option value="">Nenhum (Administrativo)</option>
                            {memberProfessionals.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Cargo Atual no Banco */}
                        <div className="hidden md:flex flex-col text-right">
                          <span className="text-[10px] text-zinc-400 font-black uppercase">Cargo Atual</span>
                          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">
                            {m.role === "OWNER" ? "Proprietário" : m.role === "MANAGER" ? "Gerente" : "Funcionário"}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                        <button
                          onClick={() => handleSaveMember(m.id)}
                          disabled={savingMemberId === m.id}
                          className="flex-1 md:flex-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingMemberId === m.id ? "..." : "Salvar"}
                        </button>
                        {!isOwner && (
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-2 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition"
                            title="Remover Acesso"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}