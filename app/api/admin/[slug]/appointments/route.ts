import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);
    
    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    
    if (!date) {
      return NextResponse.json({ error: "Data não informada" }, { status: 400 });
    }

    const [appointments, professionals, servicesCount, professionalsCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: membership.tenantId,
          businessDate: date,
          // O PONTO 3 (FILTRO) ENTRARÁ AQUI DEPOIS, VAMOS FOCAR NO 1 E 2 AGORA
        },
        include: { 
          client: true, 
          service: true, 
          professional: true 
        },
        // CORREÇÃO DO PONTO 2: Ordenando pelo minuto do dia (do menor para o maior)
        orderBy: { 
          startMinutes: "asc" 
        },
      }),
      prisma.professional.findMany({
        where: { tenantId: membership.tenantId, active: true },
        select: { id: true, name: true }
      }),
      prisma.service.count({ where: { tenantId: membership.tenantId } }),
      prisma.professional.count({ where: { tenantId: membership.tenantId } }),
    ]);

    return NextResponse.json({
      tenant: { id: membership.tenant.id, name: membership.tenant.name },
      hasServices: servicesCount > 0,
      hasProfessionals: professionalsCount > 0,
      professionals,
      appointments: appointments.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        status: a.status,
        // DADOS EXTRAS PARA O PONTO 1:
        client: { 
          name: a.client.name,
          phone: a.client.phoneE164 // Enviando o WhatsApp
        },
        service: { 
          name: a.service.name,
          duration: a.service.durationMin, // Enviando a duração
          price: a.service.price // Enviando o preço
        },
        professional: { id: a.professional.id, name: a.professional.name },
      })),
    });
  } catch (error) {
    console.error("ERRO API ADMIN:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}