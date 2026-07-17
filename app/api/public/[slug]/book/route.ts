import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";

interface BookBody {
  serviceId: string;
  professionalId: string;
  startAt: string;
  clientName: string;
  clientPhoneE164: string;
  notes?: string;
}

function getBaseUrl(req: Request) {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

async function safeSendWhatsApp(
  label: string,
  payload: {
    tenantId: string;
    clientId?: string | null;
    to: string;
    text: string;
    replyToMessageId?: string;
  }
) {
  try {
    const result = await sendTenantWhatsAppMessage(payload);

    if (!result.success) {
      console.error(label, result.reason, result.data);
    }
  } catch (error) {
    console.error(label, error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.error("[BOOK_ROUTE_HIT]", {
      slug,
      time: new Date().toISOString(),
    });

    const body = (await req.json()) as BookBody;
    const {
      serviceId,
      professionalId,
      startAt,
      clientName,
      clientPhoneE164,
      notes,
    } = body;

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

    if (
      service.tenantId !== tenant.id ||
      professional.tenantId !== tenant.id
    ) {
      return NextResponse.json(
        { error: "Serviço ou profissional inválido para este tenant" },
        { status: 400 }
      );
    }

    if (tenant.subscriptionStatus === "CANCELED") {
      return NextResponse.json(
        {
          error:
            "Agendamentos temporariamente indisponíveis para este estabelecimento.",
        },
        { status: 403 }
      );
    }

    const TZ = "America/Sao_Paulo";
    const rawDate = startAt.split("T")[0];
    const rawTime = startAt.split("T")[1]?.substring(0, 5) || "00:00";

    // Impedir agendamento em datas passadas
    const now = new Date();
    const nowInBR = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
    const yearBR = nowInBR.getFullYear();
    const monthBR = String(nowInBR.getMonth() + 1).padStart(2, "0");
    const dayBR = String(nowInBR.getDate()).padStart(2, "0");
    const todayStr = `${yearBR}-${monthBR}-${dayBR}`;

    if (rawDate < todayStr) {
      return NextResponse.json(
        { error: "Não é possível realizar agendamentos em datas passadas." },
        { status: 400 }
      );
    }

    const startUtc = fromZonedTime(`${rawDate}T${rawTime}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    const [hours, minutes] = rawTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    const clientRecord = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: tenant.id,
          phoneE164: clientPhoneE164,
        },
      },
      update: {
        name: clientName,
      },
      create: {
        tenantId: tenant.id,
        name: clientName,
        phoneE164: clientPhoneE164,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        professionalId: professional.id,
        serviceId: service.id,
        clientId: clientRecord.id,
        businessDate: rawDate,
        startMinutes,
        endMinutes,
        timeZone: TZ,
        startAt: startUtc,
        endAt: endUtc,
        notes: notes || null,
        status: "CONFIRMED",
      },
      include: {
        professional: true,
        service: true,
        tenant: true,
        client: true,
      },
    });

    const currentStatus = appointment.tenant?.subscriptionStatus;

    console.log("[BOOK_DEBUG] subscriptionStatus:", currentStatus);
    console.log("[BOOK_DEBUG] tenantId:", tenant.id);
    console.log("[BOOK_DEBUG] clientPhone:", appointment.client?.phoneE164);
    console.log(
      "[BOOK_DEBUG] professionalPhone:",
      appointment.professional?.phoneE164
    );

    if (currentStatus !== "CANCELED") {
      const dateLabel = formatInTimeZone(appointment.startAt, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(appointment.startAt, TZ, "HH:mm");
      const baseUrl = getBaseUrl(req);
      const manageLink = `${baseUrl}/s/${slug}/a/${appointment.id}`;

      if (appointment.professional?.phoneE164) {
        console.log("[BOOK_DEBUG] enviando barbeiro");

        const msgBarbeiro =
          `🚨 *Novo Cliente na área!*\n\n` +
          `Fala, *${appointment.professional.name}*, você tem um novo agendamento:\n\n` +
          `👤 *Cliente:* ${appointment.client?.name}\n` +
          `💈 *Serviço:* ${appointment.service?.name}\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}\n\n` +
          `Dá uma olhada na sua agenda completa no painel do TratoMarcado.`;

        await safeSendWhatsApp("[BOOK_WHATSAPP_PROFESSIONAL_FAILURE]", {
          tenantId: tenant.id,
          clientId: appointment.clientId,
          to: appointment.professional.phoneE164,
          text: msgBarbeiro,
        });
      }

      if (appointment.client?.phoneE164) {
        console.log("[BOOK_DEBUG] enviando cliente");

        const msgCliente =
          `Fala, *${appointment.client.name}*! ✂️\n\n` +
          `Seu trato tá oficialmente marcado na *${appointment.tenant?.name}*.\n\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}\n` +
          `💈 *Barbeiro:* ${appointment.professional?.name}\n\n` +
          `📄 *Recibo e Cancelamento:* ${manageLink}\n\n` +
          `Dica: Se precisar desmarcar, use o link acima ou nos avise com antecedência. Nos vemos em breve! 👊`;

        await safeSendWhatsApp("[BOOK_WHATSAPP_CLIENT_FAILURE]", {
          tenantId: tenant.id,
          clientId: appointment.clientId,
          to: appointment.client.phoneE164,
          text: msgCliente,
        });
      }
    } else {
      console.log(
        `[WhatsApp] Bloqueado: Status ${currentStatus} não permite envio.`
      );
    }

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("Erro na rota book:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.error("[BOOK_PATCH_HIT]", {
      slug,
      time: new Date().toISOString(),
    });

    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID do agendamento não enviado" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado" },
        { status: 404 }
      );
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId: tenant.id,
      },
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    const TZ = "America/Sao_Paulo";

    const cancelledApp = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELED" },
      include: {
        professional: true,
        client: true,
        tenant: true,
        service: true,
      },
    });

    const dateLabel = formatInTimeZone(cancelledApp.startAt, TZ, "dd/MM/yyyy");
    const timeLabel = formatInTimeZone(cancelledApp.startAt, TZ, "HH:mm");

    if (cancelledApp.professional?.phoneE164) {
      const msgBarbeiro =
        `❌ *Horário Liberado!*\n\n` +
        `O cliente *${cancelledApp.client?.name}* cancelou o horário das ${timeLabel} no dia ${dateLabel}. ` +
        `Esse horário já voltou para a sua agenda e está disponível para novos agendamentos. 🔄`;

      await safeSendWhatsApp("[BOOK_WHATSAPP_TEMPORARY_FAILURE]", {
        tenantId: cancelledApp.tenantId,
        clientId: cancelledApp.clientId,
        to: cancelledApp.professional.phoneE164,
        text: msgBarbeiro,
      });
    }

    if (cancelledApp.client?.phoneE164) {
      const msgCliente =
        `❌ *Cancelamento Confirmado*\n\n` +
        `Olá ${cancelledApp.client?.name}, seu agendamento na *${cancelledApp.tenant?.name}* para o dia ${dateLabel} às ${timeLabel} foi cancelado.`;

      await safeSendWhatsApp("[BOOK_WHATSAPP_TEMPORARY_FAILURE]", {
        tenantId: cancelledApp.tenantId,
        clientId: cancelledApp.clientId,
        to: cancelledApp.client.phoneE164,
        text: msgCliente,
      });
    }

    return NextResponse.json(cancelledApp);
  } catch (error: any) {
    console.error("Erro no cancelamento:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar agendamento" },
      { status: 500 }
    );
  }
}
