import { MetadataRoute } from 'next';
import { prisma } from "@/lib/prisma";

export default async function manifest({ params }: { params: { slug: string } }): Promise<MetadataRoute.Manifest> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
  });

  return {
    name: tenant?.name || 'Barbearia',
    short_name: tenant?.name || 'Agendamento',
    description: `Sistema de agendamento da ${tenant?.name}`,
    start_url: `/s/${params.slug}`,
    display: 'standalone',
    background_color: '#09090b',
    theme_color: tenant?.primaryColor || '#10b981',
    icons: [
      {
        src: tenant?.logoUrl || '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable', // Resolve o problema das logos com fundo colorido no Android
      },
    ],
  };
}