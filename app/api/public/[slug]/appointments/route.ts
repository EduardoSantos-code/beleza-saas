import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });

    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59`);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true }
    });

    if (!tenant) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

    // BUSCA AGENDAMENTOS
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        client: true,
        service: true,
        professional: true,
      },
      orderBy: { startAt: "asc" },
    });

    // BUSCA PROFISSIONAIS (Isso é o que faltava para as abas funcionarem!)
    const professionals = await prisma.professional.findMany({
      where: { tenantId: tenant.id, active: true },
      select: { id: true, name: true }
    });

    // BUSCA SE TEM SERVIÇOS/PROFISSIONAIS (Para o Onboarding)
    const servicesCount = await prisma.service.count({ where: { tenantId: tenant.id } });
    const professionalsCount = await prisma.professional.count({ where: { tenantId: tenant.id } });

    return NextResponse.json({
      tenant,
      appointments,
      professionals, // <-- Enviando para o frontend
      hasServices: servicesCount > 0,
      hasProfessionals: professionalsCount > 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}