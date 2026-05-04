import Link from "next/link";
import { 
  LayoutDashboard, 
  Store, 
  MessageSquare, 
  Megaphone, 
  Settings 
} from "lucide-react"; // Assumindo que usa a biblioteca lucide-react para ícones


export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
      {/* Menu Lateral */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-emerald-400">TratoMarcado</h1>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Super Admin</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <Link href="/master" className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <LayoutDashboard size={18} />
            Visão Geral
          </Link>
          <Link href="/master/saloes" className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <Store size={18} />
            Gerir Salões
          </Link>
          <Link href="/master/whatsapp" className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <MessageSquare size={18} />
            Status WhatsApp
          </Link>
          <Link href="/master/avisos" className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
            <Megaphone size={18} />
            Avisos Globais
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link href="/master/configuracoes" className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:text-white transition-colors">
            <Settings size={18} />
            Configurações
          </Link>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}