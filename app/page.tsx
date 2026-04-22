export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-violet-600">
              SaaS para salões de beleza
            </p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-zinc-900">
              Agenda online com WhatsApp, branding e gestão em um só lugar
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-zinc-600">
              Crie a página do seu salão, receba agendamentos online,
              gerencie horários, profissionais, bloqueios, mensagens e assinatura.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700"
              >
                Começar teste grátis
              </a>

              <a
                href="/login"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Entrar
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
            <div className="rounded-2xl bg-zinc-900 p-6 text-white">
              <p className="text-sm text-zinc-300">Studio Bella</p>
              <h2 className="mt-2 text-2xl font-bold">Agendamento online</h2>
              <p className="mt-2 text-zinc-300">
                Página pública personalizada, horários inteligentes e WhatsApp integrado.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Página pública</p>
                <p className="mt-1 font-semibold text-zinc-900">/s/seu-salao</p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Painel interno</p>
                <p className="mt-1 font-semibold text-zinc-900">Agenda + Inbox</p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">WhatsApp</p>
                <p className="mt-1 font-semibold text-zinc-900">Lembretes automáticos</p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Personalização</p>
                <p className="mt-1 font-semibold text-zinc-900">Logo, cor e banner</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}