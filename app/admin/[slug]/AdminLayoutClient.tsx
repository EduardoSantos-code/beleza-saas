// app/admin/[slug]/layout.tsx
import { Metadata } from "next";
import AdminLayoutClient from "./layout";

// 1. O Next.js aceita metadata aqui porque este é um Server Component (não tem "use client")
export const metadata: Metadata = {
  title: "Admin | TratoMarcado",
  icons: {
    icon: "/favicon.png",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  // 2. Ele apenas "chama" o componente de cliente e passa o conteúdo dentro
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}