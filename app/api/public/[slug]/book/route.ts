import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { z } from "zod";
import { NextResponse } from "next/server";
import { logWhatsAppOutboundMessage } from "@/lib/whatsapp-log";
import { isTenantBillingActive } from "@/lib/billing";

const BookSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  startAtISO: z.string().min(1),
  clientName: z.string().min(2),
  clientPhoneE164: z.string().regex(/^\+\d{10,15}$/),
  notes: z.string().max(500).optional().or(z.literal("")),
});

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();

    const parsed = BookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        whatsappConfig: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Salão não encontrado" },
        { status: 404 }
      );
    }
    if (!isTenantBillingActive(tenant)) {
      return NextResponse.json(
        { error: "Este salão está temporariamente indisponível para novos agendamentos." },
        { status: 402 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: parsed.data.serviceId,
        tenantId: tenant.id,
        active: true,
      },
    });

    const professional = await prisma.professional.findFirst({
      where: {
        id: parsed.data.professionalId,
        tenantId: tenant.id,
        active: true,
      },
    });

    if (!service || !professional) {
      return NextResponse.json(
        { error: "Serviço ou profissional inválido" },
        { status: 400 }
      );
    }

    const startAt = new Date(parsed.data.startAtISO);

    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json(
        { error: "Horário inválido" },
        { status: 400 }
      );
    }

    const endAt = new Date(startAt.getTime() + service.durationMin * 60 * 1000);

    const conflict = await prisma.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        professionalId: professional.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Horário indisponível" },
        { status: 409 }
      );
    }

    const client = await prisma.client.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: tenant.id,
          phoneE164: parsed.data.clientPhoneE164,
        },
      },
      create: {
        tenantId: tenant.id,
        name: parsed.data.clientName,
        phoneE164: parsed.data.clientPhoneE164,
      },
      update: {
        name: parsed.data.clientName,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        professionalId: professional.id,
        serviceId: service.id,
        clientId: client.id,
        startAt,
        endAt,
        status: "CONFIRMED",
        notes: parsed.data.notes || null,
      },
    });

    const sendAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000);

    if (sendAt > new Date()) {
      await prisma.reminder.create({
        data: {
          appointmentId: appointment.id,
          sendAt,
        },
      });
    }

    let whatsappSent = false;
    let whatsappError: string | null = null;

    if (tenant.whatsappConfig) {
      try {
        const confirmationText =
          `Olá, ${client.name}! Seu agendamento foi confirmado.\n\n` +
          `Salão: ${tenant.name}\n` +
          `Serviço: ${service.name}\n` +
          `Profissional: ${professional.name}\n` +
          `Data e hora: ${formatDateTime(startAt)}\n\n` +
          `Se precisar alterar, entre em contato com o salão.`;

        const waResponse = await sendWhatsAppText({
          phoneNumberId: tenant.whatsappConfig.phoneNumberId,
          accessToken: tenant.whatsappConfig.accessToken,
          to: client.phoneE164,
          text: confirmationText,
        });

        await logWhatsAppOutboundMessage({
          tenantId: tenant.id,
          clientId: client.id,
          phoneNumberId: tenant.whatsappConfig.phoneNumberId,
          toPhoneE164: client.phoneE164,
          textBody: confirmationText,
          waMessageId: waResponse?.messages?.[0]?.id ?? null,
          rawJson: waResponse,
        });

        whatsappSent = true;
      } catch (error: any) {
        console.error("Erro ao enviar confirmação WhatsApp:", error);
        whatsappError = error?.message || "Erro ao enviar WhatsApp";
      }
    }

    return NextResponse.json(
      {
        ok: true,
        appointmentId: appointment.id,
        whatsappSent,
        whatsappError,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro em /api/public/[slug]/book:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar agendamento" },
      { status: 500 }
    );
  }
}