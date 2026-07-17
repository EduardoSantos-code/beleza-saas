import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { clientName, clientPhone, serviceId, professionalId, date, time } =
      body as {
        clientName: string;
        clientPhone: string;
        serviceId: string;
        professionalId: string;
        date: string;
        time: string;
      };

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
    });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Impedir agendamento em dias que já passaram
    const now = new Date();
    const nowInBR = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const yearBR = nowInBR.getFullYear();
    const monthBR = String(nowInBR.getMonth() + 1).padStart(2, "0");
    const dayBR = String(nowInBR.getDate()).padStart(2, "0");
    const todayStr = `${yearBR}-${monthBR}-${dayBR}`;

    if (date < todayStr) {
      return NextResponse.json(
        { error: "Não é possível realizar agendamentos em datas passadas." },
        { status: 400 }
      );
    }

    const cleanPhone = clientPhone?.replace(/\D/g, "") || "";
    const isPlaceholder = /^0+$/.test(cleanPhone);
    const hasPhone = cleanPhone !== "" && !isPlaceholder;

    const startAt = new Date(`${date}T${time}:00-03:00`);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
    const [hours, minutes] = time.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    let client;
    if (hasPhone) {
      client = await prisma.client.upsert({
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
    } else {
      client = await prisma.client.create({
        data: {
          name: clientName,
          phoneE164: null,
          tenantId: tenant.id,
        },
      });
    }

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
      },
    });

    if (hasPhone && cleanPhone.length >= 10) {
      const [year, month, day] = date.split("-");
      const dateLabel = `${day}/${month}/${year}`;
      const timeLabel = time;

      const manageLink = `https://tratomarcado.tech/s/${tenant.slug}/a/${appointment.id}`;

      const msgCliente =
        `Fala, *${clientName}*! ✂️\n\n` +
        `Seu trato tá oficialmente marcado na *${tenant.name}*.\n\n` +
        `📅 *Data:* ${dateLabel}\n` +
        `🕒 *Hora:* ${timeLabel}\n` +
        `💈 *Barbeiro:* ${professional.name}\n\n` +
        `📄 *Recibo e Cancelamento:* ${manageLink}\n\n` +
        `Dica: Se precisar desmarcar, use o link acima ou nos avise com antecedência. Nos vemos em breve! 👊`;

      try {
        const waResult = await sendTenantWhatsAppMessage({
          tenantId: tenant.id,
          clientId: client.id,
          to: cleanPhone,
          text: msgCliente,
        });

        if (!waResult.success) {
          console.error(
            "[MANUAL_APPOINTMENT_WHATSAPP_SEND_FAILED]",
            waResult
          );
        }
      } catch (waError) {
        console.error(
          "[MANUAL_APPOINTMENT_WHATSAPP_ERROR]",
          waError
        );
      }
    }

    return NextResponse.json({ success: true, appointment });
  } catch (error: any) {
    console.error("ERRO NO PRISMA:", error);
    return NextResponse.json(
      { error: "Erro ao salvar agendamento" },
      { status: 500 }
    );
  }
}
