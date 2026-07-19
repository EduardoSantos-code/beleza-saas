import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/auth";
import { uploadImageBuffer, cloudinary } from "@/lib/cloudinary";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const photos = await prisma.galleryPhoto.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/gallery:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são permitidas" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem deve ter no máximo 5MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicId = `gallery_${Date.now()}`;

    const result = await uploadImageBuffer({
      buffer,
      folder: `beleza-saas/${tenant.id}/gallery`,
      publicId,
    });

    // Get max sortOrder
    const maxSort = await prisma.galleryPhoto.aggregate({
      where: { tenantId: tenant.id },
      _max: { sortOrder: true },
    });

    const photo = await prisma.galleryPhoto.create({
      data: {
        tenantId: tenant.id,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        caption: caption?.trim() || null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Erro em POST /api/admin/[slug]/gallery:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await requireTenantAccess(slug);

    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ error: "ID da foto é obrigatório" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const photo = await prisma.galleryPhoto.findFirst({
      where: { id: photoId, tenantId: tenant.id },
    });

    if (!photo) {
      return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(photo.publicId);
    } catch (err) {
      console.warn("Erro ao deletar foto do Cloudinary:", err);
    }

    await prisma.galleryPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro em DELETE /api/admin/[slug]/gallery:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
