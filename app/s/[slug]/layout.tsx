// app/s/[slug]/layout.tsx
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// No Next.js 15, o params é uma Promise!
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  
  const { slug } = await params; // <--- O SEGREDO ESTÁ AQUI

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug }, // Agora o slug não será mais undefined
    select: { name: true, logoUrl: true }
  });

  const title = tenant?.name || "Agendamento Online";
  const logo = tenant?.logoUrl || "/favicon.png";

  return {
    title: title,
    manifest: `/s/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: title,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: logo,
      apple: logo,
    },
  };
}

export default async function PublicLayout({ 
  children,
  params
}: { 
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  // Mesmo que não use o slug no HTML, é bom dar o await aqui se for usar no futuro
  await params; 
  return <>{children}</>;
}