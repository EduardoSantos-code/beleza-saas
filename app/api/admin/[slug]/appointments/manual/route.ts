import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { clientName, serviceId, professionalId, date, time } = body as {
      clientName: string;
      serviceId: string;
      professionalId: string;
      date: string;
      time: string;
    };

    // 1. Busca os dados necessários
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });

    if (!tenant || !service) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 2. LÓGICA DE TEMPO (A solução para o erro de 'endMinutes')
    const startAt = new Date(`${date}T${time}:00-03:00`);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    
    // Converte "14:30" para 870 minutos
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = (hours * 60) + minutes;
    
    // Calcula o final: 870 + 30 (duração) = 900 minutos
    const endMinutes = startMinutes + service.durationMin;

    // 3. Criamos o cliente primeiro
    const newClient = await prisma.client.create({
      data: {
        name: clientName,
        phoneE164: "00000000000",
        tenant: { connect: { id: tenant.id } }
      }
    });

    // 4. Criamos o agendamento com TODOS os campos que o Prisma exige
    const appointment = await prisma.appointment.create({
      data: {
        businessDate: date,
        startAt,
        endAt,
        startMinutes, // ✅ Resolvido
        endMinutes,   // ✅ RESOLVIDO AGORA
        status: "CONFIRMED",
        tenant: { connect: { id: tenant.id } },
        professional: { connect: { id: professionalId } },
        service: { connect: { id: serviceId } },
        client: { connect: { id: newClient.id } },
      }
    });

    return NextResponse.json({ success: true, appointment });

  } catch (error: any) {
    console.error("ERRO NO PRISMA:", error);
    return NextResponse.json({ error: "Erro interno ao salvar." }, { status: 500 });
  }
}