"use client";

import { useEffect, useState } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  title: "Admin | TratoMarcado",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params?.slug as string;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- NOVA PARTE: Estado para guardar o usuário ---
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  // --- NOVA PARTE: Busca o usuário logado ---
  useEffect(() => {
    async function fetchUser() {
      try {
        // Essa rota de API precisa existir para devolver seus dados
        const res = await fetch('/api/auth/me'); 
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    }
    fetchUser();
  }, []);

  // Pega a inicial do nome (Eduardo -> E)
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  // Lista de links do menu
  const links = [
    { name: "Agenda", href: `/admin/${slug}`, icon: "📅" },
    { name: "Assinatura", href: `/admin/${slug}/billing`, icon: "💳" },
    { name: "Métricas", href: `/admin/${slug}/metrics`, icon: "📊" },
    { name: "Serviços", href: `/admin/${slug}/services`, icon: "✂️" },
    { name: "Profissionais", href: `/admin/${slug}/professionals`, icon: "💈" },
    { name: "Horários", href: `/admin/${slug}/hours`, icon: "⏰" },
    { name: "Bloqueios", href: `/admin/${slug}/blocks`, icon: "🔒" },
    { name: "Branding", href: `/admin/${slug}/branding`, icon: "🎨" },
  ];

  if (!slug) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50 dark:bg-zinc-950 md:flex-row">

      {/* Barra superior (Apenas para Celular) */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:hidden shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-zinc-900 dark:text-white">Painel Admin</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Fundo escuro mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Menu Lateral (Sidebar) */}
      <aside
        className={`fixed left-0 top-0 z-50 w-72 h-[100dvh] flex flex-col transform border-r border-zinc-200 bg-white transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 md:static md:h-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 shrink-0">
          <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight italic">TratoMarcado</span>
          <button onClick={() => setIsSidebarOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-zinc-200 p-4 pb-12 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900">
          <LogoutButton />
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full overflow-x-hidden">
        <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden md:flex">
          <h1 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em]">Painel de Controle</h1>
          
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <div className="flex items-center gap-4 pl-6 border-l border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col text-right hidden sm:flex">
                {/* NOME DINÂMICO AQUI */}
                <span className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                  {user?.name || "Carregando..."}
                </span>
                <span className="text-[12px] font-black text-emerald-500 uppercase tracking-widest">
                  {user?.role === "MASTER" ? "👑 Master" : "💈 Responsável"}
                </span>
              </div>
              
              {/* INICIAL DINÂMICA AQUI */}
              <div className="h-10 w-10 rounded-2xl bg-zinc-900 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-zinc-950 font-black text-lg shadow-lg">
                {initial}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}