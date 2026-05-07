import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
// 👇 IMPORTANTE: Importe a sua função que envia a mensagem (ajuste o caminho se necessário)
import { sendWhatsAppMessage } from "@/lib/whatsapp"; 

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { clientName, clientPhone, serviceId, professionalId, date, time } = body as {
      clientName: string;
      clientPhone: string;
      serviceId: string;
      professionalId: string;
      date: string;
      time: string;
    };

    // 1. Busca os dados essenciais para o banco e para a mensagem
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 2. Limpa o telefone e define um padrão se estiver vazio
    const cleanPhone = clientPhone?.replace(/\D/g, "") || "00000000000";

    // 3. Cálculos de Tempo
    const startAt = new Date(`${date}T${time}:00-03:00`);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = (hours * 60) + minutes;
    const endMinutes = startMinutes + service.durationMin;

    // 4. UPSERT: Cria ou atualiza o cliente
    const client = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: tenant.id,
          phoneE164: cleanPhone,
        },
      },
      update: { name: clientName },
      create: {
        name: clientName,
        phoneE164: cleanPhone,
        tenantId: tenant.id,
      },
    });

    // 5. Cria o agendamento no banco
    const appointment = await prisma.appointment.create({
      data: {
        businessDate: date,
        startAt,
        endAt,
        startMinutes,
        endMinutes,
        status: "CONFIRMED",
        tenant: { connect: { id: tenant.id } },
        professional: { connect: { id: professionalId } },
        service: { connect: { id: serviceId } },
        client: { connect: { id: client.id } },
      }
    });

    // 6. 🚀 DISPARO DO WHATSAPP (Se o telefone não for o fictício)
    if (cleanPhone !== "00000000000" && cleanPhone.length >= 10) {
      // Formata a data de YYYY-MM-DD para DD/MM/YYYY
      const [year, month, day] = date.split('-');
      const dateLabel = `${day}/${month}/${year}`;
      const timeLabel = time;
      
      const manageLink = `https://tratomarcado.tech/s/${tenant.slug}/a/${appointment.id}`;

      const msgCliente = `Fala, *${clientName}*! ✂️\n\n` +
        `Seu trato tá oficialmente marcado na *${tenant.name}*.\n\n` +
        `📅 *Data:* ${dateLabel}\n` +
        `🕒 *Hora:* ${timeLabel}\n` +
        `💈 *Barbeiro:* ${professional.name}\n\n` +
        `📄 *Recibo e Cancelamento:* ${manageLink}\n\n` +
        `Dica: Se precisar desmarcar, use o link acima ou nos avise com antecedência. Nos vemos em breve! 👊`;

      try {
        await sendWhatsAppMessage(cleanPhone, msgCliente);
      } catch (waError) {
        console.error("Erro ao enviar notificação de WhatsApp:", waError);
        // Ocultamos o erro do cliente final para não travar a criação no frontend,
        // mas registramos no console.
      }
    }

    return NextResponse.json({ success: true, appointment });

  } catch (error: any) {
    console.error("ERRO NO PRISMA:", error);
    return NextResponse.json({ error: "Erro ao salvar agendamento" }, { status: 500 });
  }
}