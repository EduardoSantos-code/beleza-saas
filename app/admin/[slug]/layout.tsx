// app/admin/[slug]/layout.tsx
import { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin | TratoMarcado",
  icons: {
    icon: "/favicon.png", 
    apple: "/favicon.png", 
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}