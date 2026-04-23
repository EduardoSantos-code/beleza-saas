import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 1. Tipagem rigorosa para acabar com o erro de 'any' do Prisma
interface AppointmentBody {
  serviceId: string;
  professionalId: string;
  startAt: string;
  clientName: string;
  clientPhoneE164: string;
  notes?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Forçamos o TypeScript a entender o formato exato do body
    const body = (await req.json()) as AppointmentBody;

    const { 
      serviceId, 
      professionalId, 
      startAt, 
      clientName, 
      clientPhoneE164, 
      notes 
    } = body;

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const start = new Date(startAt);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        serviceId,
        professionalId,
        startAt: start,
        endAt: end,
        notes,
        status: "CONFIRMED",
        client: {
          connectOrCreate: {
            where: { 
              tenantId_phoneE164: {
                tenantId: tenant.id,
                phoneE164: clientPhoneE164,
              }
            },
            create: {
              name: clientName,
              phoneE164: clientPhoneE164,
              tenantId: tenant.id,
            }
          }
        }
      },
      include: {
        professional: true,
        service: true,
        tenant: true,
        client: true,
      }
    });

    // ==========================================
    // LÓGICA DO WHATSAPP MASTER (CENTRALIZADO)
    // ==========================================
    
    async function sendWhatsApp(to: string, text: string) {
      try {
        const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_MASTER_PHONE_ID}/messages`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.WHATSAPP_MASTER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: text },
          }),
        });
      } catch (e) {
        console.error("Erro ao enviar Zap:", e);
      }
    }

    const dateLabel = start.toLocaleDateString("pt-BR");
    const timeLabel = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Usamos o operador "!" para garantir ao TS que client e tenant não são nulos
    const clientMsg = `✅ *Agendamento Confirmado!*\n\nOlá ${appointment.client!.name}, seu horário na *${appointment.tenant!.name}* foi reservado.\n\n📅 *Data:* ${dateLabel}\n⏰ *Hora:* ${timeLabel}\n✂️ *Serviço:* ${service.name}\n👤 *Profissional:* ${professional.name}\n\n_Enviado via TratoMarcado_`;
    
    await sendWhatsApp(appointment.client!.phoneE164, clientMsg);

    if (professional.phoneE164) {
      const profMsg = `🚀 *Novo Agendamento!*\n\nEi ${professional.name}, você tem um novo cliente na agenda.\n\n👤 *Cliente:* ${clientName}\n📅 *Data:* ${dateLabel}\n⏰ *Hora:* ${timeLabel}\n✂️ *Serviço:* ${service.name}`;
      await sendWhatsApp(professional.phoneE164, profMsg);
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}