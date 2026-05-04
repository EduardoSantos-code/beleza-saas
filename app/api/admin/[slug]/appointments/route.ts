import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Pegamos a data que vem na URL (?date=2026-05-03)
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    // 2. Buscamos o salão (Tenant)
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    // 3. BUSCA DO AVISO GLOBAL (A novidade está aqui!)
    const announcement = await prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { content: true } // Só precisamos do texto
    });

    // 4. Buscamos os agendamentos e profissionais (como você já fazia)
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        businessDate: date || undefined,
        professional: {
          active: true,
        },
      },
      include: {
        client: true,
        service: true,
        professional: true,
      },
      orderBy: { startAt: "asc" },
    });

    const professionals = await prisma.professional.findMany({
      where: {
        tenantId: tenant.id,
        active: true,
      },
    });

    // 5. RETORNO COMPLETO: Agora enviamos o aviso junto!
    return NextResponse.json({
      tenant,
      appointments,
      professionals,
      announcement // O frontend vai ler isso aqui e mostrar o banner verde
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}