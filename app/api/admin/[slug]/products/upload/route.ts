import { getCurrentMembershipBySlug } from "@/lib/auth";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeSlug(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Envie apenas arquivos de imagem." },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Imagem muito grande. Máximo de 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeSlug = normalizeSlug(slug);
    const uniqueId = `product-${Date.now()}`;

    // Enviar para o Cloudinary na pasta de produtos do tenant
    const result = await uploadImageBuffer({
      buffer,
      folder: `beleza-saas/${safeSlug}/products`,
      publicId: uniqueId,
    });

    const secureUrl = result.secure_url as string;

    return NextResponse.json({
      ok: true,
      url: secureUrl,
    });
  } catch (error: any) {
    console.error("Erro no upload de foto de produto:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar upload de imagem." },
      { status: 500 }
    );
  }
}
