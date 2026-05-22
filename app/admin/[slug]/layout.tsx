// app/admin/[slug]/layout.tsx
import { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin | TratoMarcado",
  icons: {
    icon: "/favicon.png", 
    apple: "/favicon.png", 
  },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session ? { name: session.name, role: session.role || "USER" } : null;

  return <AdminLayoutClient initialUser={user}>{children}</AdminLayoutClient>;
}