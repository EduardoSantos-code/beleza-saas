import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    const clients = await prisma.client.findMany({
      where: {
        tenantId: tenant.id,
        completedCount: { gt: 0 },
        phoneE164: {
          not: null,
          notIn: [""]
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Erro na API de clientes:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
