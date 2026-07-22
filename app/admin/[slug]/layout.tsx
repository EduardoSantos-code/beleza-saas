// app/admin/[slug]/layout.tsx
import { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";
import { requireTenantAccess } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin | TratoMarcado",
  icons: {
    icon: "/favicon.png", 
    apple: "/favicon.png", 
  },
};

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const membership = await requireTenantAccess(slug);

  const user = {
    name: membership.user?.name || "Usuário",
    role: membership.role,
  };

  return <AdminLayoutClient initialUser={user}>{children}</AdminLayoutClient>;
}