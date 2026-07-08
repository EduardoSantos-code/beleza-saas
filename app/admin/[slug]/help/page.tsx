// app/admin/[slug]/help/page.tsx
"use client";

import { useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  MessageSquare,
  Package,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  UserCheck
} from "lucide-react";

type TabId = "agenda" | "status" | "bloqueios" | "horarios" | "produtos";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export default function BarberHelpPage() {
  const [activeTab, setActiveTab] = useState<TabId>("agenda");

  const tabs: TabConfig[] = [
    {
      id: "agenda",
      label: "Controlar Agenda",
      icon: <Calendar className="h-5 w-5" />,
      color: "border-blue-500 text-blue-500 dark:text-blue-400 bg-blue-500/10",
    },
    {
      id: "status",
      label: "Ciclo de Status",
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "border-emerald-500 text-emerald-500 dark:text-emerald-400 bg-emerald-500/10",
    },
    {
      id: "bloqueios",
      label: "Bloquear Horários",
      icon: <Lock className="h-5 w-5" />,
      color: "border-red-500 text-red-500 dark:text-red-400 bg-red-500/10",
    },
    {
      id: "horarios",
      label: "Definir Expediente",
      icon: <Clock className="h-5 w-5" />,
      color: "border-amber-500 text-amber-500 dark:text-amber-400 bg-amber-500/10",
    },
    {
      id: "produtos",
      label: "Retirada de Produtos",
      icon: <Package className="h-5 w-5" />,
      color: "border-teal-500 text-teal-500 dark:text-teal-400 bg-teal-500/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/20">
              <BookOpen className="h-3 w-3" /> Manual do Profissional
            </span>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tight">
              Guia Prático "Como Usar"
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xl font-medium leading-relaxed">
              Esqueceu como faz um bloqueio ou como confirma a comissão? Escolha um tópico abaixo para ver o passo a passo ilustrado e rápido.
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 text-zinc-400 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
            <HelpCircle className="h-10 w-10 text-emerald-500" />
            <div className="text-xs">
              <p className="font-bold text-zinc-700 dark:text-zinc-300">Dica de Ouro</p>
              <p className="text-zinc-400">Adicione este painel à tela inicial do celular!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Navegação e Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Menu Lateral das Abas */}
        <aside className="lg:col-span-4 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide shrink-0">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full rounded-2xl px-5 py-4 text-sm font-bold transition-all border text-left whitespace-nowrap lg:whitespace-normal shrink-0 ${
                  isSelected
                    ? "bg-zinc-950 border-zinc-800 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-md shadow-zinc-950/10 scale-[1.02]"
                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className={`p-2 rounded-xl border ${isSelected ? "bg-emerald-500 text-white border-emerald-500" : tab.color}`}>
                  {tab.icon}
                </span>
                <span className="flex-1">{tab.label}</span>
                <ChevronRight className={`h-4 w-4 hidden lg:block transition-transform duration-200 ${isSelected ? "translate-x-1" : "opacity-30"}`} />
              </button>
            );
          })}
        </aside>

        {/* Área de Conteúdo */}
        <main className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm min-h-[460px] relative">
          
          {/* Aba 1: Agenda */}
          {activeTab === "agenda" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-3 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Como Controlar sua Agenda Diária
                  </h2>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Módulo da Agenda Principal</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                A tela de **Agenda** é onde você passa a maior parte do dia. Nela, cada profissional cadastrado tem uma coluna dedicada que lista seus horários livres e reservados.
              </p>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Passo a Passo de Navegação:</h3>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">1</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    **Mudar o dia:** Use as setas de navegação no topo da agenda para pular para o dia seguinte/anterior ou clique na data para abrir o calendário e ir direto a um dia específico.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">2</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    **Verificar detalhes:** Passe o mouse ou dê um toque sobre qualquer agendamento reservado para ver qual é o serviço contratado, telefone de contato e qualquer observação inserida.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black">3</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    **Visualização Unificada:** No celular, você pode arrastar a tela para o lado para alternar e ver a coluna de outros barbeiros/colegas de trabalho.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 space-y-1.5">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">💡 Importante:</p>
                <p className="leading-relaxed">
                  Os horários só aparecem no site para os clientes se estiverem livres tanto no horário geral do salão quanto na sua agenda particular, e se não houver nenhum bloqueio.
                </p>
              </div>
            </div>
          )}

          {/* Aba 2: Ciclo de Status */}
          {activeTab === "status" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Ciclo de Status do Agendamento
                  </h2>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Comissão e Comportamento de Clientes</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Manter o status do agendamento atualizado é crucial. O sistema utiliza esses estados para calcular suas comissões e enviar lembretes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Concluído (Completed)</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Marque assim que terminar o atendimento. Isso garante que a comissão do serviço seja computada para você no fechamento financeiro.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20">Falta (No-Show)</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Se o cliente não apareceu e não avisou. Marcar a falta adiciona `+1` na contagem de faltas do perfil do cliente, ajudando a identificar ausências recorrentes.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">Confirmado (Confirmed)</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Indica que o cliente confirmou (via WhatsApp ou portal) que irá comparecer. Fique de olho nesses horários!
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">Cancelado (Canceled)</span>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    O horário fica imediatamente liberado no site para outros clientes agendarem.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-500" /> Como atualizar:
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Clique no agendamento desejado na agenda, clique na caixa de seleção **Status**, mude para a opção desejada (ex: Concluído) e clique em **Salvar**.
                </p>
              </div>
            </div>
          )}

          {/* Aba 3: Bloquear Horários */}
          {activeTab === "bloqueios" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-3 bg-red-500/10 text-red-500 dark:text-red-400 rounded-2xl border border-red-500/20">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Bloquear Horários de Forma Rápida
                  </h2>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Folgas, Almoço Extra e Compromissos</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Precisa ir ao médico, resolver algo no banco ou vai folgar à tarde? Crie um **Bloqueio de Horário** para impedir que clientes agendem esses horários.
              </p>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Como criar o bloqueio:</h3>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black">1</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Vá no menu **Bloqueios** no menu lateral esquerdo.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black">2</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Clique no botão **Adicionar Bloqueio** no canto superior direito.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black">3</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Preencha o **Título** (ex: "Consulta Dentista"), selecione o seu **Profissional**, a **Data** e o **Horário de Início** e **Fim**.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black">4</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    **Dia Completo:** Caso vá folgar o dia todo, basta marcar a caixa "Dia Inteiro" em vez de colocar horários.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-xs text-red-600/80 flex gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="leading-relaxed">
                  **Aviso:** O bloqueio remove a vaga do site na mesma hora. Se já houver um cliente agendado no horário bloqueado, fale com ele e altere a consulta antes para não gerar conflito!
                </p>
              </div>
            </div>
          )}

          {/* Aba 4: Definir Expediente */}
          {activeTab === "horarios" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-3 bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Definir Seus Dias e Horários de Trabalho
                  </h2>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Escala Semanal e Pausa de Almoço</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Você pode gerenciar sua própria escala semanal de trabalho. Isso evita que clientes marquem serviços em dias que você não atende ou no seu horário de almoço.
              </p>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Como ajustar seus horários:</h3>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">1</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Acesse a tela de **Horários** no painel administrativo.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">2</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Selecione o seu nome de profissional (caso seja administrador) ou acesse sua aba pessoal.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">3</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Ative ou desative o botão lateral de cada dia (Segunda a Sábado) para definir se trabalha naquele dia.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">4</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Defina o **Horário de Início e Fim** do expediente e os limites da sua **Pausa de Almoço (Intervalo)**. O sistema bloqueará seu horário de almoço automaticamente para descanso.
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Aba 6: Retirada de Produtos */}
          {activeTab === "produtos" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-3 bg-teal-500/10 text-teal-500 dark:text-teal-400 rounded-2xl border border-teal-500/20">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Aprovar e Entregar Produtos Reservados
                  </h2>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Gestão de Venda Física e Estoque</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Os clientes podem encomendar pomadas, ceras ou óleos de barba pelo site. Você deve separar o item e dar baixa na entrega.
              </p>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Passo a Passo de Venda:</h3>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-black">1</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Acesse a aba **Estoque** no menu administrativo e selecione a aba de **Reservas**.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-black">2</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Encontre as solicitações marcadas como **Pendente (Pending)**. Separe o produto físico no estoque e marque a reserva como **Confirmada (Confirmed)** para sinalizar que o item está guardado.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-black">3</div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Quando o cliente chegar para cortar o cabelo e retirar a pomada, receba o pagamento e mude o status para **Retirado (Picked Up)**. O estoque dará baixa permanentemente.
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Rodapé de Dúvidas */}
      <div className="text-center py-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 font-medium">
        <p>Ainda com dúvidas? Fale com o gerente ou com o administrador do salão.</p>
        <p className="mt-1">TratoMarcado © 2026 - Painel do Profissional.</p>
      </div>

    </div>
  );
}
