// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Smartphone,
  TrendingUp,
  CalendarX2,
  CalendarCheck,
  Sparkles,
  Download,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function LandingPage() {
  const activeTenants = await prisma.tenant.findMany({
    where: {
      planStatus: {
        in: ["TRIAL", "ACTIVE"],
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      publicDescription: true,
      logoUrl: true,
      heroImageUrl: true,
      address: true,
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 overflow-x-hidden relative">

      {/* Detalhe de Brilho de Fundo (Design System) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/5 blur-[150px] pointer-events-none z-0" />

      {/* HEADER */}
      <header className="fixed top-0 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="TratoMarcado Logo"
              width={250}
              height={65}
              className="h-14 w-auto relative z-10"
            />
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <Link
              href="/login"
              className="text-xs md:text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-[11px] md:text-sm font-black uppercase tracking-wider px-4 py-2.5 md:px-6 md:py-3 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-lg shadow-emerald-500/10"
            >
              Testar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-44 pb-20 px-6 max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-8 border border-emerald-500/25">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          SaaS de Elite para Barbearias e Salões Modernos
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white italic tracking-tighter mb-8 leading-[0.95]">
          A AGENDA COMPLETA DO SEU SALÃO, <br />
          <span className="text-emerald-500">NO AUTOMÁTICO e COM SUA MARCA.</span>
        </h1>

        <p className="text-base md:text-xl text-zinc-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
          Vá muito além dos agendamentos comuns. Tenha seu próprio **Clube de Assinatura** para reter faturamento mensal e um **Web App exclusivo com a sua logo** instalado no celular dos seus clientes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 max-w-md mx-auto">
          <Link
            href="/signup"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 h-14 rounded-2xl font-black uppercase text-xs tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10"
          >
            Criar meu salão agora <ArrowRight size={16} />
          </Link>
        </div>
        <p className="text-[11px] text-zinc-500 font-black uppercase tracking-wider mt-4">14 dias grátis • Sem cartão de crédito • Configuração em 2 min</p>
      </section>

      {/* AS DORES DO MERCADO */}
      <section className="py-24 px-6 bg-zinc-900/40 border-y border-zinc-900 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-red-400 font-black uppercase tracking-widest text-[10px] mb-2">O problema</p>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
              Você ainda vive preso ao <span className="text-red-400">caderninho ou WhatsApp?</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900 border border-zinc-800/80 p-8 rounded-[2rem] relative overflow-hidden group">
              <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
                <CalendarX2 size={24} />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-3">Prejuízo com No-Show</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">O cliente marca e simplesmente esquece de aparecer. Sem avisar, ele deixa sua cadeira vazia e rasga o seu faturamento do dia.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/80 p-8 rounded-[2rem] relative overflow-hidden group">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-3">Escravo das Mensagens</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">Interromper um corte cirúrgico a cada 10 minutos para mandar áudio ou responder "tem vaga para hoje?" drena sua energia e seu foco.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/80 p-8 rounded-[2rem] relative overflow-hidden group">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-3">Faturamento Instável</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">Se chover ou se for uma semana de feriado, o movimento cai e seu caixa sofre. Falta de previsibilidade financeira para expandir.</p>
            </div>
          </div>
        </div>
      </section>

      {/* OS SUPER RECURSOS (ATUALIZADA) */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <p className="text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-2">A Evolução do seu Negócio</p>
          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
            Muito mais que uma agenda comum.
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">

            {/* NOVO RECURSO: CLUBE DE ASSINATURA */}
            <div className="flex gap-6 p-6 rounded-[2rem] border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                <Sparkles size={26} />
              </div>
              <div>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider inline-block mb-1">Inédito</span>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-1">Clube de Assinatura Recorrente</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">Crie planos mensais (ex: Corte Livre ou 2x por mês) direto na plataforma. O dinheiro cai direto no seu caixa todo mês via Assinatura Asaas ou Mercado Pago, garantindo faturamento previsível e fidelidade cega.</p>
              </div>
            </div>

            {/* NOVO RECURSO: PWA APP PERSONALIZADO */}
            <div className="flex gap-6 p-6 rounded-[2rem] border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                <Download size={26} />
              </div>
              <div>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider inline-block mb-1">Exclusivo</span>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-1">Web App (PWA) com a SUA Logo</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">Seu cliente não entra em sites comuns. Ele instala a sua página de agendamento na tela do celular como se fosse um aplicativo nativo, personalizado com a sua logo e suas cores de marca.</p>
              </div>
            </div>

            {/* WHATSAPP AUTOMÁTICO */}
            <div className="flex gap-6 p-6 rounded-[2rem] border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                <MessageCircle size={26} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-1">Disparos de Notificação WhatsApp</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">Confirmações instantâneas e lembretes automáticos enviados exatamente 2 horas antes do corte. Acabe de uma vez por todas com a desculpa do "esqueci de marcar".</p>
              </div>
            </div>

          </div>

          {/* MOCKUP VISUAL INTERATIVO */}
          <div className="relative lg:pl-10">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />

            {/* Card Principal - Dashboard Simulada */}
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl space-y-6">

              {/* Topo do Mockup App */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500 text-zinc-950 font-black flex items-center justify-center text-xs italic">SB</div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Sharp Blade Barbearia</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Instalado no celular (Web App)</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={12} /> PWA Ativo
                </div>
              </div>

              {/* Box Clube VIP VIP */}
              <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-emerald-500/20 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-emerald-500 text-zinc-950 font-black text-[8px] uppercase px-2 py-0.5 rounded">
                  Assinatura Pro
                </div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Membro do Clube VIP</p>
                <h5 className="font-black text-white text-base uppercase italic tracking-tight">Plano Cabelo Ilimitado</h5>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>Recorrência Mensal:</span>
                  <span className="text-white font-black">R$ 79,90/mês</span>
                </div>
                <div className="mt-2 text-[10px] text-zinc-500 font-medium">Status de Pagamento: <span className="text-emerald-400 font-bold">Aprovado via Asaas ou Mercado Pago</span></div>
              </div>

              {/* Logs do Zap */}
              <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex items-start gap-3">
                <MessageCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-zinc-200">Lembrete Automático WhatsApp</p>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">"Olá João, seu Trato está Marcado para hoje às 14:00 com o barbeiro Eduardo!"</p>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider block mt-2">✓ Enviado 2h antes</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO PREÇO ÚNICO */}
      <section className="py-24 px-6 bg-zinc-900/30 border-y border-zinc-900 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-2">Transparência Total</p>
          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase mb-6">
            O investimento que se paga com 1 cliente retido.
          </h2>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mb-14 font-medium">
            Acesso completo e irrestrito a todas as ferramentas, incluindo os novos módulos de assinatura e PWA. Sem pegadinhas ou taxas adicionais.
          </p>

          {/* Card Pricing no Design System */}
          <div className="bg-zinc-950 border border-emerald-500/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-[10px] font-black px-5 py-1.5 rounded-bl-2xl uppercase tracking-widest">
              Plano Pro Completo
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center text-left">
              <div>
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tight mb-2">Trato Pro</h3>
                <p className="text-zinc-400 text-sm font-medium mb-8">Controle cirúrgico do tempo, da marca e da recorrência do seu salão.</p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-6xl font-black text-white tracking-tighter italic">R$ 39</span>
                  <span className="text-lg font-black text-zinc-500 uppercase tracking-wider">/mês</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Sem fidelidade • Cancele quando quiser</p>
              </div>

              <div className="space-y-4">
                {[
                  "Agendamentos Online Ilimitados",
                  "Módulo de Clube de Assinatura (VIP)",
                  "Instalação de Web App PWA Personalizado",
                  "Lembretes e Avisos Automáticos de WhatsApp",
                  "Gestão Multi-Profissional e Serviços",
                  "Painel com Métricas de Faturamento"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-zinc-200 text-sm font-semibold">{feature}</span>
                  </div>
                ))}

                <div className="pt-6">
                  <Link
                    href="/signup"
                    className="block text-center w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 h-14 rounded-2xl font-black uppercase text-xs tracking-[0.15em] transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-500/10"
                  >
                    Testar Grátis Por 14 Dias
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO LOBBY DE BARBEARIAS */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <p className="text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-2">Salões & Barbearias</p>
          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
            Nossos Parceiros Ativos
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto mt-4 font-medium">
            Escolha uma de nossas barbearias credenciadas e agende seu atendimento em segundos.
          </p>
        </div>

        {activeTenants.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/20 border border-zinc-800 rounded-3xl p-8 max-w-md mx-auto">
            <p className="text-zinc-400 font-bold">Nenhum parceiro ativo encontrado no momento.</p>
            <p className="text-xs text-zinc-500 mt-2">Crie o seu salão no botão acima e seja o primeiro!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeTenants.map((tenant) => {
              const initials = tenant.name ? tenant.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "TM";
              
              return (
                <div 
                  key={tenant.id}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-[2rem] overflow-hidden group hover:border-emerald-500/30 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem de Capa / Cover */}
                    <div className="h-44 w-full relative bg-gradient-to-br from-emerald-500/20 to-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-850">
                      {tenant.heroImageUrl ? (
                        <img 
                          src={tenant.heroImageUrl} 
                          alt={tenant.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/40 via-zinc-900 to-emerald-900/20 flex items-center justify-center">
                          <span className="text-5xl font-black italic text-emerald-500/10 tracking-widest uppercase">
                            {tenant.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Logo / Badge */}
                      <div className="absolute -bottom-6 left-6 h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 font-black shadow-xl">
                        {tenant.logoUrl ? (
                          <img 
                            src={tenant.logoUrl} 
                            alt={tenant.name} 
                            className="h-full w-full object-cover rounded-2xl"
                          />
                        ) : (
                          <span className="text-lg italic tracking-tight">{initials}</span>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-6 pt-10 space-y-3">
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tight group-hover:text-emerald-400 transition-colors">
                        {tenant.name}
                      </h3>
                      
                      <p className="text-zinc-400 text-xs font-medium leading-relaxed line-clamp-3">
                        {tenant.publicDescription || "Os melhores profissionais, serviços e planos de assinatura para cuidar do seu visual com comodidade."}
                      </p>
                      
                      {tenant.address && (
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 pt-2">
                          📍 {tenant.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ação */}
                  <div className="p-6 pt-0">
                    <Link
                      href={`/s/${tenant.slug}`}
                      className="w-full bg-zinc-950 hover:bg-emerald-500 hover:text-zinc-950 text-white h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 border border-zinc-800 group-hover:border-emerald-500/20"
                    >
                      Ver Agenda & Serviços <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 border-t border-zinc-900 text-center text-zinc-500 relative z-10">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/logo.png"
            alt="TratoMarcado Logo"
            width={150}
            height={40}
            className="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} TratoMarcado. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}