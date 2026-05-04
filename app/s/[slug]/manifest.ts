// app/s/[slug]/manifest.ts
import { MetadataRoute } from 'next';
import { prisma } from "@/lib/prisma";

export default async function manifest({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<MetadataRoute.Manifest> {
  
  const { slug } = await params; // <--- AWAIT AQUI TAMBÉM

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug },
  });

  return {
    name: tenant?.name || 'TratoMarcado',
    short_name: tenant?.name || 'Agendamento',
    start_url: `/s/${slug}`,
    display: 'standalone',
    background_color: '#09090b',
    theme_color: tenant?.primaryColor || '#10b981',
    icons: [
      {
        src: tenant?.logoUrl || '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}