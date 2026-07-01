import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

function getClientSessionSecret() {
  const secret =
    process.env.CLIENT_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-client-session-secret";

  if (
    process.env.NODE_ENV === "production" &&
    secret === "dev-only-client-session-secret"
  ) {
    throw new Error("CLIENT_SESSION_SECRET não configurado.");
  }

  return new TextEncoder().encode(secret);
}

function formatCurrencyBR(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function calculateClubDiscount(
  originalPrice: number,
  discountPercent: number | null
) {
  const safeOriginalPrice = Math.max(0, originalPrice || 0);
  const safePercent =
    typeof discountPercent === "number"
      ? Math.min(100, Math.max(0, discountPercent))
      : 0;

  const discountAmount = Math.round((safeOriginalPrice * safePercent) / 100);
  const finalPrice = Math.max(0, safeOriginalPrice - discountAmount);

  return {
    originalPrice: safeOriginalPrice,
    discountAmount,
    finalPrice,
  };
}

function getBenefitPeriodKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

    console.error("[APPOINTMENT_ROUTE_HIT]", {
      slug,
      time: new Date().toISOString(),
      url: req.url,
    });

    const body = await req.json();
    const {
      serviceId,
      professionalId,
      startAt,
      clientName,
      clientPhoneE164,
      notes,
      useClubBenefit,
    } = body;

    if (!clientName || clientName.trim().length < 3) {
      return NextResponse.json(
        { error: "Nome inválido ou muito curto." },
        { status: 400 }
      );
    }

    if (!clientPhoneE164 || clientPhoneE164.trim().length < 12) {
      return NextResponse.json(
        { error: "Número de WhatsApp inválido." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
    });

    if (!tenant || !service || !professional) {
      return NextResponse.json(
        { error: "Dados do agendamento inválidos." },
        { status: 400 }
      );
    }

    if (
      service.tenantId !== tenant.id ||
      professional.tenantId !== tenant.id
    ) {
      return NextResponse.json(
        { error: "Serviço ou profissional inválido para este tenant." },
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

    let subscriptionData: Prisma.ClubSubscriptionGetPayload<{
      include: { plan: true; client: true };
    }> | null = null;

    if (useClubBenefit === true) {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("club_benefit_session")?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "Valide sua assinatura do clube para usar o benefício." },
          { status: 401 }
        );
      }

      try {
        const { payload } = await jwtVerify(
          sessionToken,
          getClientSessionSecret()
        );

        const isValid =
          payload.purpose === "CLUB_USE_BENEFIT" &&
          payload.tenantId === tenant.id &&
          payload.slug === tenant.slug &&
          payload.phoneE164 === clientPhoneE164 &&
          !!payload.subscriptionId;

        if (!isValid) {
          return NextResponse.json(
            {
              error:
                "Sessão do clube inválida. Valide seu WhatsApp novamente.",
            },
            { status: 401 }
          );
        }

        const subscription = await prisma.clubSubscription.findFirst({
          where: {
            id: payload.subscriptionId as string,
            tenantId: tenant.id,
            status: "ACTIVE",
            currentPeriodEnd: { gte: new Date() },
          },
          include: {
            plan: true,
            client: true,
          },
        });

        if (
          !subscription ||
          !subscription.plan ||
          subscription.client.phoneE164 !== clientPhoneE164
        ) {
          return NextResponse.json(
            { error: "Assinatura do clube não está ativa." },
            { status: 400 }
          );
        }

        subscriptionData = subscription;
      } catch {
        return NextResponse.json(
          {
            error:
              "Sessão do clube inválida. Valide seu WhatsApp novamente.",
          },
          { status: 401 }
        );
      }
    }

    const TZ = "America/Sao_Paulo";
    const startUtc = new Date(startAt);

    if (isNaN(startUtc.getTime())) {
      return NextResponse.json(
        { error: "Data de agendamento inválida." },
        { status: 400 }
      );
    }

    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);
    const localTimeString = formatInTimeZone(startUtc, TZ, "HH:mm");
    const localDateString = formatInTimeZone(startUtc, TZ, "yyyy-MM-dd");

    const [hours, minutes] = localTimeString.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Lock no profissional para evitar concorrência (agendamentos duplicados)
      await tx.$executeRaw`SELECT id FROM "Professional" WHERE id = ${professionalId} FOR UPDATE`;

      // 2. Verificar conflito de horário (agendamentos ativos no mesmo período)
      const conflicts = await tx.appointment.findFirst({
        where: {
          tenantId: tenant.id,
          professionalId,
          status: { not: "CANCELED" },
          startAt: { lt: endUtc },
          endAt: { gt: startUtc },
        },
      });

      if (conflicts) {
        throw new Error("SLOT_OCCUPIED");
      }

      // 3. Verificar conflitos com ScheduleBlocks (Bloqueios de agenda)
      const blocks = await tx.scheduleBlock.findFirst({
        where: {
          tenantId: tenant.id,
          startAt: { lt: endUtc },
          endAt: { gt: startUtc },
          OR: [
            { professionalId: null },
            { professionalId },
          ],
        },
      });

      if (blocks) {
        throw new Error("SLOT_BLOCKED");
      }

      const clientRecord = await tx.client.upsert({
        where: {
          tenantId_phoneE164: {
            tenantId: tenant.id,
            phoneE164: clientPhoneE164,
          },
        },
        update: {
          name: clientName.trim(),
        },
        create: {
          tenantId: tenant.id,
          name: clientName.trim(),
          phoneE164: clientPhoneE164,
        },
      });

      let appliedClubMode:
        | "NORMAL_PRICE"
        | "PERCENT_DISCOUNT"
        | "INCLUDED_FREE_SERVICE" = "NORMAL_PRICE";
      let clubSubscriptionId: string | null = null;
      let clubPlanName: string | null = null;
      let clubOriginalPrice: number | null = null;
      let clubDiscountAmount: number | null = null;
      let clubFinalPrice: number | null = null;
      let periodKey = "";

      if (subscriptionData && subscriptionData.plan) {
        const plan = subscriptionData.plan;
        clubSubscriptionId = subscriptionData.id;
        clubPlanName = plan.name;

        const isEligibleForFree =
          plan.includedBenefitType === "FREE_SERVICE" &&
          (plan.includedUsesPerPeriod ?? 0) !== 0;

        if (isEligibleForFree) {
          periodKey = getBenefitPeriodKey(startUtc);

          const usedCount = await tx.clubBenefitUsage.count({
            where: {
              tenantId: tenant.id,
              subscriptionId: subscriptionData.id,
              serviceId: service.id,
              periodKey,
              benefitType: "FREE_SERVICE",
            },
          });

          if (plan.includedUsesPerPeriod === -1 || usedCount < (plan.includedUsesPerPeriod ?? 0)) {
            appliedClubMode = "INCLUDED_FREE_SERVICE";
            clubOriginalPrice = service.price || 0;
            clubDiscountAmount = service.price || 0;
            clubFinalPrice = 0;
          }
        }

        if (
          appliedClubMode === "NORMAL_PRICE" &&
          (plan.discountPercent ?? 0) > 0
        ) {
          const prices = calculateClubDiscount(
            service.price || 0,
            plan.discountPercent
          );
          appliedClubMode = "PERCENT_DISCOUNT";
          clubOriginalPrice = prices.originalPrice;
          clubDiscountAmount = prices.discountAmount;
          clubFinalPrice = prices.finalPrice;
        } else if (appliedClubMode === "NORMAL_PRICE") {
          clubOriginalPrice = service.price || 0;
          clubDiscountAmount = 0;
          clubFinalPrice = service.price || 0;
        }
      }

      console.error("[APPOINTMENT_CLUB_FIELDS_BEFORE_CREATE]", {
        appliedClubMode,
        clubSubscriptionId,
        clubPlanName,
        clubOriginalPrice,
        clubDiscountAmount,
        clubFinalPrice,
      });

      const newAppointment = await tx.appointment.create({
        data: {
          tenantId: tenant.id,
          serviceId,
          professionalId,
          clientId: clientRecord.id,
          businessDate: localDateString,
          startMinutes,
          endMinutes,
          timeZone: TZ,
          startAt: startUtc,
          clubSubscriptionId,
          clubPlanName,
          clubOriginalPrice,
          clubDiscountAmount,
          clubFinalPrice,
          endAt: endUtc,
          notes,
          status: "CONFIRMED",
        },
        include: {
          professional: true,
          service: true,
          tenant: true,
          client: true,
        },
      });

      console.error("[APPOINTMENT_CLUB_FIELDS_AFTER_CREATE]", {
        appointmentId: newAppointment.id,
        clubSubscriptionId: newAppointment.clubSubscriptionId,
        clubPlanName: newAppointment.clubPlanName,
        clubOriginalPrice: newAppointment.clubOriginalPrice,
        clubDiscountAmount: newAppointment.clubDiscountAmount,
        clubFinalPrice: newAppointment.clubFinalPrice,
      });

      if (appliedClubMode === "INCLUDED_FREE_SERVICE" && subscriptionData) {
        await tx.clubBenefitUsage.create({
          data: {
            tenantId: tenant.id,
            subscriptionId: subscriptionData.id,
            appointmentId: newAppointment.id,
            clientId: clientRecord.id,
            planId: subscriptionData.planId,
            serviceId: service.id,
            periodKey,
            benefitType: "FREE_SERVICE",
          },
        });

        console.error("[CLUB_BOOKING_USAGE_CREATED]", {
          subscriptionId: subscriptionData.id,
          serviceId: service.id,
          periodKey,
        });
      }

      return newAppointment;
    });

    const currentStatus = appointment.tenant?.subscriptionStatus;

    console.error("[APPOINTMENT_DEBUG] subscriptionStatus:", currentStatus);
    console.error("[APPOINTMENT_DEBUG] tenantId:", tenant.id);
    console.error("[APPOINTMENT_DEBUG] clientPhone:", appointment.client?.phoneE164);
    console.error(
      "[APPOINTMENT_DEBUG] professionalPhone:",
      appointment.professional?.phoneE164
    );

    if (currentStatus !== "CANCELED") {
      const dateLabel = formatInTimeZone(appointment.startAt, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(appointment.startAt, TZ, "HH:mm");
      const baseUrl = getBaseUrl(req);
      const manageLink = `${baseUrl}/s/${slug}/a/${appointment.id}`;

      const clubMessage =
        appointment.clubSubscriptionId &&
        appointment.clubPlanName &&
        appointment.clubOriginalPrice !== null &&
        appointment.clubDiscountAmount !== null &&
        appointment.clubFinalPrice !== null
          ? [
              "",
              `Clube aplicado: ${appointment.clubPlanName}`,
              `Valor original: ${formatCurrencyBR(appointment.clubOriginalPrice)}`,
              `Desconto do clube: -${formatCurrencyBR(
                appointment.clubDiscountAmount
              )}`,
              `Valor final: ${formatCurrencyBR(appointment.clubFinalPrice)}`,
            ].join("\n")
          : "";

      if (appointment.professional?.phoneE164) {
        console.error("[APPOINTMENT_DEBUG] enviando barbeiro");

        const msgBarbeiro =
          `🚨 *Novo Cliente na área!*\n\n` +
          `Fala, *${appointment.professional.name}*, você tem um novo agendamento:\n\n` +
          `👤 *Cliente:* ${appointment.client?.name}\n` +
          `💈 *Serviço:* ${appointment.service?.name}\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}${clubMessage}\n\n` +
          `Dá uma olhada na sua agenda completa no painel do TratoMarcado.`;

        await safeSendWhatsApp("[APPOINTMENT_WHATSAPP_PROFESSIONAL_FAILURE]", {
          tenantId: tenant.id,
          clientId: appointment.clientId,
          to: appointment.professional.phoneE164,
          text: msgBarbeiro,
        });
      }

      if (appointment.client?.phoneE164) {
        console.error("[APPOINTMENT_DEBUG] enviando cliente");

        const msgCliente =
          `Fala, *${appointment.client.name}*! ✂️\n\n` +
          `Seu trato tá oficialmente marcado na *${appointment.tenant?.name}*.\n\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}\n` +
          `💈 *Profissional:* ${appointment.professional?.name}${clubMessage}\n\n` +
          `📄 *Recibo e Cancelamento:* ${manageLink}\n\n` +
          `Dica: Se precisar desmarcar, use o link acima ou nos avise com antecedência. Nos vemos em breve! 👊`;

        await safeSendWhatsApp("[APPOINTMENT_WHATSAPP_CLIENT_FAILURE]", {
          tenantId: tenant.id,
          clientId: appointment.clientId,
          to: appointment.client.phoneE164,
          text: msgCliente,
        });
      }
    } else {
      console.error(
        `[APPOINTMENT_DEBUG] envio bloqueado por subscriptionStatus=${currentStatus}`
      );
    }

    return NextResponse.json(appointment);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "SLOT_OCCUPIED" || error.message === "SLOT_BLOCKED")) {
      const message =
        error.message === "SLOT_OCCUPIED"
          ? "Este horário já foi reservado por outro cliente."
          : "Este horário está bloqueado ou indisponível.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("[APPOINTMENT_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
