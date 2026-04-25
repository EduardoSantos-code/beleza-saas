"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "./LogoutButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params?.slug as string;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Lista de links do menu
  const links = [
    { name: "Agenda", href: `/admin/${slug}`, icon: "📅" },
    { name: "Assinatura", href: `/admin/${slug}/billing`, icon: "💳" },
    { name: "Métricas", href: `/admin/${slug}/metrics`, icon: "📊" },
    { name: "Serviços", href: `/admin/${slug}/services`, icon: "✂️" },
    { name: "Profissionais", href: `/admin/${slug}/professionals`, icon: "💈" },
    { name: "Horários", href: `/admin/${slug}/hours`, icon: "⏰" },
    { name: "Bloqueios", href: `/admin/${slug}/blocks`, icon: "🔒" },
    { name: "WhatsApp", href: `/admin/${slug}/whatsapp`, icon: "💬" },
    { name: "Inbox", href: `/admin/${slug}/inbox`, icon: "📥" },
    { name: "Branding", href: `/admin/${slug}/branding`, icon: "🎨" },
  ];

  if (!slug) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 md:flex-row">
      
      {/* Barra superior (Apenas para Celular) */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
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

      {/* Fundo escuro quando menu está aberto no mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Menu Lateral (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform flex-col border-r border-zinc-200 bg-white transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 md:static md:flex md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6">
          <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">TratoMarcado.</span>
          <button onClick={() => setIsSidebarOpen(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4 pb-12 lg:pb-4 dark:border-zinc-800 space-y-4">
          <div className="hidden md:flex items-center justify-between px-2">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Tema</span>
            <ThemeToggle />
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Conteúdo Principal (Onde as páginas vão renderizar) */}
      <main className="flex-1 w-full overflow-x-hidden p-4 md:p-8 lg:p-10">
        {children}
      </main>
    </div>
  );
}