import { getCurrentMembershipBySlug } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await req.formData();

    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    if (type !== "logo" && type !== "hero") {
      return NextResponse.json(
        { error: "Tipo inválido. Use 'logo' ou 'hero'" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Envie apenas imagens" },
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeSlug = normalizeSlug(tenant.slug);

    const result = await uploadImageBuffer({
      buffer,
      folder: `beleza-saas/${safeSlug}/branding`,
      publicId: type === "logo" ? "logo" : "hero",
    });

    const secureUrl = result.secure_url as string;

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data:
        type === "logo"
          ? { logoUrl: secureUrl }
          : { heroImageUrl: secureUrl },
      select: {
        id: true,
        logoUrl: true,
        heroImageUrl: true,
      },
    });

    return NextResponse.json({
      ok: true,
      type,
      url: secureUrl,
      tenant: updatedTenant,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/admin/[slug]/branding/upload:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno ao enviar imagem" },
      { status: 500 }
    );
  }
}