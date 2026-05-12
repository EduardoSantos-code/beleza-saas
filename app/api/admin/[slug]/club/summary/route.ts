import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Validar acesso
    await requireTenantAccess(slug);

    // 2 & 3. Buscar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado." },
        { status: 404 }
      );
    }

    // 4. Buscar assinaturas
    const subscriptions = await prisma.clubSubscription.findMany({
      where: { tenantId: tenant.id },
      include: { plan: true },
    });

    // 5. Calcular métricas
    let activeSubscribers = 0;
    let pendingSubscribers = 0;
    let overdueSubscribers = 0;
    let canceledSubscribers = 0;
    let expiredSubscribers = 0;

    let monthlyRecurringRevenueInCents = 0;
    let activeRevenueInCents = 0;

    for (const sub of subscriptions) {
      if (sub.status === "ACTIVE") {
        activeSubscribers++;
        activeRevenueInCents += sub.plan.priceInCents;

        if (sub.plan.billingCycle === "MONTHLY") monthlyRecurringRevenueInCents += sub.plan.priceInCents;
        else if (sub.plan.billingCycle === "QUARTERLY") monthlyRecurringRevenueInCents += Math.round(sub.plan.priceInCents / 3);
        else if (sub.plan.billingCycle === "SEMIANNUAL") monthlyRecurringRevenueInCents += Math.round(sub.plan.priceInCents / 6);
        else if (sub.plan.billingCycle === "YEARLY") monthlyRecurringRevenueInCents += Math.round(sub.plan.priceInCents / 12);
      } else if (sub.status === "PENDING") {
        pendingSubscribers++;
      } else if (sub.status === "OVERDUE") {
        overdueSubscribers++;
      } else if (sub.status === "CANCELED") {
        canceledSubscribers++;
      } else if (sub.status === "EXPIRED") {
        expiredSubscribers++;
      }
    }

    const totalSubscribers = subscriptions.length;
    const averageActiveTicketInCents = activeSubscribers > 0 ? Math.round(activeRevenueInCents / activeSubscribers) : 0;

    // 6. Calcular descontos no mês atual
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startAt: { gte: startOfMonth, lte: endOfMonth },
        clubDiscountAmount: { not: null },
      },
      select: { clubDiscountAmount: true },
    });

    const clubAppointmentsThisMonth = appointments.length;
    const totalClubDiscountThisMonthInCents = appointments.reduce((acc, curr) => acc + (curr.clubDiscountAmount || 0), 0);

    // 7. Retornar
    return NextResponse.json({
      activeSubscribers,
      pendingSubscribers,
      overdueSubscribers,
      canceledSubscribers,
      expiredSubscribers,
      totalSubscribers,
      monthlyRecurringRevenueInCents,
      activeRevenueInCents,
      averageActiveTicketInCents,
      totalClubDiscountThisMonthInCents,
      clubAppointmentsThisMonth,
    });
  } catch (error) {
    console.error("[CLUB_SUMMARY_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}