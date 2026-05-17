import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  MessageSquare,
  Megaphone,
  Menu,
} from "lucide-react";

function NavLinks() {
  return (
    <>
      <Link
        href="/master"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <LayoutDashboard size={18} />
        Visão Geral
      </Link>

      <Link
        href="/master/saloes"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Store size={18} />
        Gerir Salões
      </Link>

      <Link
        href="/master/whatsapp"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <MessageSquare size={18} />
        Status WhatsApp
      </Link>

      <Link
        href="/master/avisos"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Megaphone size={18} />
        Avisos Globais
      </Link>
    </>
  );
}

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 md:flex">
      {/* Navegação Mobile */}
      <details className="border-b border-zinc-800 bg-zinc-950 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-emerald-400">TratoMarcado</h1>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">
              Super Admin
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            <Menu size={16} />
            Menu
          </div>
        </summary>

        <nav className="space-y-2 px-4 pb-4">
          <NavLinks />
        </nav>
      </details>

      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold text-emerald-400">TratoMarcado</h1>
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            Super Admin
          </span>
        </div>

        <nav className="flex-1 space-y-2 px-4">
          <NavLinks />
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="rounded-md bg-zinc-900 px-3 py-2 text-xs text-zinc-500">
            Painel master
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
