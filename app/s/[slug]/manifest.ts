// app/s/[slug]/manifest.ts
import { MetadataRoute } from 'next';
import { prisma } from "@/lib/prisma";

function getCloudinaryIconUrl(
  url: string,
  width: number,
  height: number,
  padding: boolean,
  backgroundColor?: string
): string {
  if (!url) return '/favicon.png';
  
  // Se não for imagem do Cloudinary, retorna sem modificações
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  // 1. Garante que a extensão final seja .png para o manifest
  let pngUrl = url;
  const lastDot = url.lastIndexOf('.');
  const lastSlash = url.lastIndexOf('/');
  if (lastDot > lastSlash) {
    pngUrl = url.substring(0, lastDot) + '.png';
  } else {
    pngUrl = url + '.png';
  }

  // 2. Monta as transformações do Cloudinary
  // Para purpose 'any' (com transparência/sem preenchimento): c_limit
  // Para purpose 'maskable' (com preenchimento e margens de segurança): c_pad
  let transformation = `w_${width},h_${height}`;
  if (padding) {
    transformation += `,c_pad`;
    if (backgroundColor) {
      const cleanHex = backgroundColor.replace('#', '');
      transformation += `,b_rgb:${cleanHex}`;
    } else {
      transformation += `,b_rgb:ffffff`; // Default para fundo branco
    }
  } else {
    transformation += `,c_limit`;
  }

  // 3. Insere a transformação logo após 'image/upload/'
  const uploadToken = 'image/upload/';
  const uploadIndex = pngUrl.indexOf(uploadToken);
  if (uploadIndex !== -1) {
    const insertPosition = uploadIndex + uploadToken.length;
    return (
      pngUrl.substring(0, insertPosition) +
      transformation +
      '/' +
      pngUrl.substring(insertPosition)
    );
  }

  return pngUrl;
}

export default async function manifest({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<MetadataRoute.Manifest> {
  
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug },
  });

  const logo = tenant?.logoUrl;

  return {
    name: tenant?.name || 'TratoMarcado',
    short_name: tenant?.name || 'Agendamento',
    start_url: `/s/${slug}`,
    display: 'standalone',
    background_color: '#09090b',
    theme_color: tenant?.primaryColor || '#10b981',
    icons: logo
      ? [
          {
            src: getCloudinaryIconUrl(logo, 192, 192, false),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: getCloudinaryIconUrl(logo, 512, 512, false),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: getCloudinaryIconUrl(logo, 192, 192, true, '#ffffff'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: getCloudinaryIconUrl(logo, 512, 512, true, '#ffffff'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ]
      : [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
  };
}