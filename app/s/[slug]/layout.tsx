import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Essa função gera o título e o ícone do iPhone dinamicamente
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: { name: true, logoUrl: true, primaryColor: true }
  });

  const title = tenant?.name || "Agendamento Online";
  const logo = tenant?.logoUrl || "/favicon.png"; // Fallback para sua logo se ele não tiver

  return {
    title: title,
    description: `Reserve seu horário na ${title}`,
    
    // Configurações para o "App" do iPhone
    appleWebApp: {
      capable: true,
      title: title,
      statusBarStyle: "black-translucent",
    },

    // Ícones Dinâmicos
    icons: {
      icon: logo,      // Para Android/Chrome
      apple: logo,     // Para iPhone (Tela de Início)
    },
  };
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}