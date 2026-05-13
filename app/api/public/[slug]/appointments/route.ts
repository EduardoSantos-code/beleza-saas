import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Prisma } from "@prisma/client";

function getClientSessionSecret() {
  const secret =
    process.env.CLIENT_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-client-session-secret";

  if (process.env.NODE_ENV === "production" && secret === "dev-only-client-session-secret") {
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

function calculateClubDiscount(originalPrice: number, discountPercent: number | null) {
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

function calculateFreeServicePrice(originalPrice: number) {
  const safeOriginalPrice = Math.max(0, originalPrice || 0);
  return {
    originalPrice: safeOriginalPrice,
    discountAmount: safeOriginalPrice,
    finalPrice: 0,
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { serviceId, professionalId, startAt, clientName, clientPhoneE164, notes, useClubBenefit } = body;

    // VALIDAÇÃO DE SEGURANÇA
    if (!clientName || clientName.trim().length < 3) {
      return NextResponse.json({ error: "Nome inválido ou muito curto." }, { status: 400 });
    }
    if (!clientPhoneE164 || clientPhoneE164.trim().length < 12) {
      return NextResponse.json({ error: "Número de WhatsApp inválido." }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });

    if (!tenant || !service || !professional) {
      return NextResponse.json({ error: "Dados do agendamento inválidos." }, { status: 400 });
    }

    let subscriptionData: Prisma.ClubSubscriptionGetPayload<{
      include: { plan: true; client: true }
    }> | null = null;

    if (useClubBenefit === true) {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("club_benefit_session")?.value;

      if (!sessionToken) {
        return NextResponse.json({ error: "Valide sua assinatura do clube para usar o benefício." }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(sessionToken, getClientSessionSecret());
        
        const isValid = 
          payload.purpose === "CLUB_USE_BENEFIT" &&
          payload.tenantId === tenant.id &&
          payload.slug === tenant.slug &&
          payload.phoneE164 === clientPhoneE164 &&
          !!payload.subscriptionId;

        if (!isValid) {
          return NextResponse.json({ error: "Sessão do clube inválida. Valide seu WhatsApp novamente." }, { status: 401 });
        }

        const subscription = await prisma.clubSubscription.findFirst({
          where: {
            id: payload.subscriptionId as string,
            tenantId: tenant.id,
            status: "ACTIVE",
            currentPeriodEnd: { gte: new Date() }
          },
          include: {
            plan: true,
            client: true
          }
        });

        if (!subscription || !subscription.plan || subscription.client.phoneE164 !== clientPhoneE164) {
          return NextResponse.json({ error: "Assinatura do clube não está ativa." }, { status: 400 });
        }

        subscriptionData = subscription;
      } catch (err) {
        return NextResponse.json({ error: "Sessão do clube inválida. Valide seu WhatsApp novamente." }, { status: 401 });
      }
    }

    const TZ = "America/Sao_Paulo";

    // 1. A MÁGICA: O front-end já envia a data certinha em UTC. 
    // Basta criar o objeto Date direto, sem quebrar o texto.
    const startUtc = new Date(startAt);

    // Se a data for inválida, barramos aqui
    if (isNaN(startUtc.getTime())) {
      return NextResponse.json({ error: "Data de agendamento inválida." }, { status: 400 });
    }

    const endUtc = new Date(startUtc.getTime() + service.durationMin * 60000);

    // 2. Extraindo a hora e data local (Brasil) para salvar os minutos e o businessDate no banco
    const localTimeString = formatInTimeZone(startUtc, TZ, "HH:mm");
    const localDateString = formatInTimeZone(startUtc, TZ, "yyyy-MM-dd");

    const [hours, minutes] = localTimeString.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.durationMin;

    const appointment = await prisma.$transaction(async (tx) => {
      const clientRecord = await tx.client.upsert({
        where: { tenantId_phoneE164: { tenantId: tenant.id, phoneE164: clientPhoneE164 } },
        update: { name: clientName.trim() },
        create: { tenantId: tenant.id, name: clientName.trim(), phoneE164: clientPhoneE164 }
      });

      let appliedClubMode: "NONE" | "INCLUDED_FREE_SERVICE" | "PERCENT_DISCOUNT" = "NONE";
      let clubSubscriptionId: string | null = null;
      let clubPlanName: string | null = null;
      let clubOriginalPrice: number | null = null;
      let clubDiscountAmount: number | null = null;
      let clubFinalPrice: number | null = null;
      let periodKey = ""; // Used for usage tracking

      if (subscriptionData && subscriptionData.plan) {
        const plan = subscriptionData.plan;

        // Inicializa estado base do clube (Caso NORMAL_PRICE com assinatura válida) para persistência
        clubSubscriptionId = subscriptionData.id;
        clubPlanName = plan.name;
        clubOriginalPrice = service.price || 0;
        clubDiscountAmount = 0;
        clubFinalPrice = service.price || 0;

        // 1. Tentar Benefício Incluso (Grátis)
        const isEligibleForFree =
          plan.includedBenefitType === "FREE_SERVICE" &&
          (plan.includedUsesPerPeriod ?? 0) > 0;

        if (isEligibleForFree) {
          periodKey = getBenefitPeriodKey(startUtc);
          const usedCount = await tx.clubBenefitUsage.count({
            where: {
              tenantId: tenant.id,
              subscriptionId: subscriptionData.id,
              serviceId: service.id,
              periodKey: periodKey,
              benefitType: "FREE_SERVICE",
            },
          });

          if (usedCount < (plan.includedUsesPerPeriod ?? 0)) {
            const prices = calculateFreeServicePrice(service.price || 0);
            clubOriginalPrice = prices.originalPrice;
            clubDiscountAmount = prices.discountAmount;
            clubFinalPrice = prices.finalPrice;
            appliedClubMode = "INCLUDED_FREE_SERVICE";
          }
        }

        // 2. Fallback para Desconto Percentual se não aplicou grátis
        if (appliedClubMode === "NONE" && (plan.discountPercent ?? 0) > 0) {
          const prices = calculateClubDiscount(service.price || 0, plan.discountPercent);
          clubOriginalPrice = prices.originalPrice;
          clubDiscountAmount = prices.discountAmount;
          clubFinalPrice = prices.finalPrice;
          appliedClubMode = "PERCENT_DISCOUNT";
        }

        // Se appliedClubMode continuar "NONE", os valores base inicializados acima (NORMAL_PRICE) serão persistidos.
      }

      // 3. Criar o agendamento com os valores definidos acima
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
          startAt: startUtc, // Salva a data cravada
          clubSubscriptionId,
          clubPlanName,
          clubOriginalPrice,
          clubDiscountAmount,
          clubFinalPrice,
          endAt: endUtc,
          notes,
          status: "CONFIRMED",
        },
        include: { professional: true, service: true, tenant: true, client: true }
      });

      // 4. Registrar uso do benefício apenas se foi INCLUDED_FREE_SERVICE
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
          }
        });
      }

      return newAppointment;
    });

    // WhatsApp Notification
    const currentStatus = appointment.tenant?.subscriptionStatus;

    if (currentStatus && currentStatus !== "CANCELED") {
      const dateLabel = formatInTimeZone(appointment.startAt, TZ, "dd/MM/yyyy");
      const timeLabel = formatInTimeZone(appointment.startAt, TZ, "HH:mm");

      const clubMessage =
        appointment.clubSubscriptionId && appointment.clubPlanName && appointment.clubOriginalPrice !== null && appointment.clubDiscountAmount !== null && appointment.clubFinalPrice !== null
          ? [
              "",
              `Clube aplicado: ${appointment.clubPlanName}`,
              `Valor original: ${formatCurrencyBR(appointment.clubOriginalPrice)}`,
              `Desconto do clube: -${formatCurrencyBR(appointment.clubDiscountAmount)}`,
              `Valor final: ${formatCurrencyBR(appointment.clubFinalPrice)}`
            ].join("\n")
          : "";

      // NOTIFICAR BARBEIRO
      if (appointment.professional?.phoneE164) {
        const msgBarbeiro = `🚨 *Novo Cliente na área!*\n\n` +
          `Fala, *${appointment.professional.name}*, você tem um novo agendamento:\n\n` +
          `👤 *Cliente:* ${appointment.client?.name}\n` +
          `💈 *Serviço:* ${appointment.service?.name}\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}${clubMessage}\n\n` +
          `Dá uma olhada na sua agenda completa no painel do TratoMarcado.`;

        await sendWhatsAppMessage(appointment.professional.phoneE164, msgBarbeiro);
      }

      // NOTIFICAR CLIENTE
      // NOTIFICAR CLIENTE
      if (appointment.client?.phoneE164) {
        // Geramos o link do recibo/gestão
        // Certifique-se de que a base da URL (tratomarcado.com) está correta para o seu domínio
        const manageLink = `https://tratomarcado.tech/s/${slug}/a/${appointment.id}`;

        const msgCliente = `Fala, *${appointment.client.name}*! ✂️\n\n` +
          `Seu trato tá oficialmente marcado na *${appointment.tenant?.name}*.\n\n` +
          `📅 *Data:* ${dateLabel}\n` +
          `🕒 *Hora:* ${timeLabel}\n` +
          `💈 *Profissional:* ${appointment.professional?.name}${clubMessage}\n\n` +
          `📄 *Recibo e Cancelamento:* ${manageLink}\n\n` +
          `Dica: Se precisar desmarcar, use o link acima ou nos avise com antecedência. Nos vemos em breve! 👊`;

        await sendWhatsAppMessage(appointment.client.phoneE164, msgCliente);
      }
    }

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}