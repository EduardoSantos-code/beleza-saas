import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Scissors,
  Smartphone,
  TrendingUp,
  CalendarX2,
  CalendarCheck
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">

      <header className="fixed top-0 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">

          {/* LOGO - Ajustada para não empurrar os botões no mobile */}
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="TratoMarcado Logo"
              width={250}
              height={65}
              className="h-16 w-auto" // h-10 no mobile para caber tudo, h-16 no PC
            />
          </div>

          {/* BOTÕES - Agora visíveis em todos os dispositivos */}
          <div className="flex items-center gap-3 md:gap-6">
            <Link
              href="/login"
              className="text-xs md:text-sm font-medium hover:text-emerald-400 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-[10px] md:text-sm font-bold px-3 py-2 md:px-5 md:py-2.5 rounded-full transition-all whitespace-nowrap"
            >
              Testar Grátis
            </Link>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-sm mb-8 border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Sistema focado em barbearias e salões
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Recupere seu tempo e fature mais com uma <span className="text-emerald-500">agenda automática.</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Chega de perder horas no WhatsApp ou amargar cadeiras vazias. Seus clientes agendam sozinhos e recebem lembretes automáticos. Reduza faltas em até 80% já na primeira semana.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-lg font-bold px-8 py-4 rounded-full transition-all">
            Começar meu teste grátis de 7 dias
          </Link>
          <p className="text-sm text-zinc-500 sm:ml-4">Sem cartão de crédito. Instalação em 2 minutos.</p>
        </div>
      </section>

      {/* PROBLEMA - AS DORES */}
      <section className="py-24 px-6 bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Você ainda vive preso ao <span className="text-red-400">caderninho?</span></h2>
            <p className="text-zinc-400 text-lg">A cadeira vazia é o prejuízo que você sente no final do dia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-950 p-8 rounded-3xl border border-zinc-800">
              <CalendarX2 className="h-12 w-12 text-red-400 mb-6" />
              <h3 className="text-xl font-bold mb-3">O Esquecimento</h3>
              <p className="text-zinc-400 leading-relaxed">O cliente marca e não aparece. Sem aviso, sem satisfação. Sua cadeira fica vazia e o prejuízo é todinho seu.</p>
            </div>
            <div className="bg-zinc-950 p-8 rounded-3xl border border-zinc-800">
              <Clock className="h-12 w-12 text-amber-400 mb-6" />
              <h3 className="text-xl font-bold mb-3">A Perda de Tempo</h3>
              <p className="text-zinc-400 leading-relaxed">Você para de cortar cabelo a cada 10 minutos para responder "tem horário pra hoje?" no WhatsApp o dia inteiro.</p>
            </div>
            <div className="bg-zinc-950 p-8 rounded-3xl border border-zinc-800">
              <TrendingUp className="h-12 w-12 text-orange-400 mb-6" />
              <h3 className="text-xl font-bold mb-3">A Bagunça</h3>
              <p className="text-zinc-400 leading-relaxed">Horários sobrepostos, confusão na agenda e estresse desnecessário que acabam passando uma imagem de amadorismo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUÇÃO - BENEFÍCIOS */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Tudo o que sua barbearia precisa.</h2>
          <p className="text-zinc-400 text-lg">Tecnologia simples que trabalha enquanto você foca no corte.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Smartphone className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Seu Link, Suas Regras</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Um link profissional para sua Bio do Instagram. O cliente vê os serviços e reserva o horário sozinho em 30 segundos.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <MessageCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">WhatsApp Automático</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">O sistema envia a confirmação no ato e um lembrete antes do horário. Acabou a desculpa do "eu esqueci".</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CalendarCheck className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Gestão Simplificada</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Controle de faturamento, base de clientes e horários de forma visual e rápida. Tudo na palma da sua mão.</p>
              </div>
            </div>
          </div>

          {/* MOCKUP VISUAL */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent blur-3xl rounded-full"></div>
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-zinc-800">
                <div>
                  <p className="text-sm text-zinc-400">Próximo Agendamento</p>
                  <p className="text-xl font-bold">Hoje, 14:00</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">Confirmado</span>
              </div>
              <div className="space-y-4">
                <div className="bg-zinc-800/50 p-4 rounded-2xl">
                  <p className="font-bold">Corte Degradê + Barba</p>
                  <p className="text-sm text-zinc-400 mt-1">Cliente: João Silva</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <p className="text-sm text-emerald-400 font-medium">Lembrete automático enviado via WhatsApp com sucesso às 10:00.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANO / PREÇO */}
      <section className="py-24 px-6 bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Investimento que se paga sozinho.</h2>
          <p className="text-zinc-400 text-lg mb-12">Um único cliente que deixaria de faltar já paga o investimento mensal do sistema completo.</p>

          <div className="bg-zinc-950 border border-emerald-500/30 rounded-3xl p-8 md:p-12 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-xs font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider">
              Plano Único Pro
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center text-left">
              <div>
                <h3 className="text-3xl font-bold mb-2">Trato Pro</h3>
                <p className="text-zinc-400 mb-6">O sistema completo para quem não quer perder tempo.</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-extrabold">R$ 39</span>
                  <span className="text-xl text-zinc-500">/mês</span>
                </div>
                <p className="text-sm text-zinc-500">Sem taxas de adesão. Cancele quando quiser.</p>
              </div>

              <div className="space-y-4">
                {[
                  "Agendamentos ilimitados",
                  "Notificações automáticas no WhatsApp",
                  "Link de agendamento personalizado",
                  "Gestão de profissionais e serviços",
                  "Suporte humanizado via WhatsApp"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-zinc-200">{feature}</span>
                  </div>
                ))}

                <div className="pt-6">
                  <Link href="/signup" className="block text-center w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-lg font-bold px-8 py-4 rounded-xl transition-all">
                    Testar Grátis por 7 Dias
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-zinc-900 text-center text-zinc-500">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/logo.png"
            alt="TratoMarcado Logo"
            width={150}
            height={40}
            className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
        <p>© {new Date().getFullYear()} TratoMarcado. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}