import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Appointment, Service, Professional, Client } from "@prisma/client";

export const dynamic = 'force-dynamic';

type AppointmentWithRelations = Appointment & {
  service: Service | null;
  professional: Professional | null;
  client: Client | null;
};

function getAppointmentRevenueInCents(appointment: AppointmentWithRelations): number {
  if (typeof appointment.clubFinalPrice === "number") {
    return appointment.clubFinalPrice;
  }
  return appointment.service?.price ?? 0;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    // 1. Pega o range e garante que é um número
    const rangeParam = searchParams.get("range") || "7";
    const days = parseInt(rangeParam);

    // 2. Cálculo preciso da data (Início do dia)
    const dateLimit = new Date();
    dateLimit.setHours(0, 0, 0, 0); // Começa às 00:00 de hoje

    if (days > 1) {
      dateLimit.setDate(dateLimit.getDate() - (days - 1));
    }

    console.log(`📅 Filtrando agendamentos desde: ${dateLimit.toLocaleString()} (Range: ${days} dias)`);

    const appointments = await prisma.appointment.findMany({
      where: {
        professional: { tenant: { slug } },
        startAt: { gte: dateLimit },
      },
      include: {
        service: true,
        professional: true,
        client: true,
      },
    });

    console.log(`✅ Encontrados ${appointments.length} agendamentos para este período.`);

    let totalBruto = 0;
    let totalComissoes = 0;
    let totalClubDiscountInCents = 0;

    const completed = appointments.filter((a) => a.status === "COMPLETED") as AppointmentWithRelations[];
    completed.forEach((a) => {
      console.log(`🕵️ Data REAL do Agendamento: ${a.startAt}`);
    });

    completed.forEach((a) => {
      const preco = getAppointmentRevenueInCents(a);
      const taxa = a.professional?.commissionRate || 0;

      const comissao = (preco * taxa) / 100;

      totalBruto += preco;
      totalComissoes += comissao;
      totalClubDiscountInCents += (a.clubDiscountAmount ?? 0);
    });

    // 4. Agrupar Top Serviços
    const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
    completed.forEach((a) => {
      const name = a.service?.name || "Outros";
      if (!serviceMap[name]) serviceMap[name] = { name, count: 0, revenue: 0 };
      serviceMap[name].count++;
      serviceMap[name].revenue += getAppointmentRevenueInCents(a);
    });

    // 5. Agrupar Performance Profissionais
    const professionalMap: Record<string, { name: string; count: number }> = {};
    completed.forEach((a) => {
      const name = a.professional?.name || "Desconhecido";
      if (!professionalMap[name]) professionalMap[name] = { name, count: 0 };
      professionalMap[name].count++;
    });

    // 5.1 Agrupar Top Clientes no Período
    const clientPeriodMap: Record<string, { name: string; count: number }> = {};
    completed.forEach((a) => {
      if (a.client) {
        const clientId = a.client.id;
        if (!clientPeriodMap[clientId]) {
          clientPeriodMap[clientId] = { name: a.client.name, count: 0 };
        }
        clientPeriodMap[clientId].count++;
      }
    });

    // 5.2 Calcular Taxas de Cancelamento e No-Show
    const totalAppointments = appointments.length;
    const canceledCount = appointments.filter((a) => a.status === "CANCELED").length;
    const noShowCount = appointments.filter((a) => a.status === "NOSHOW").length;
    
    const cancellationRate = totalAppointments > 0 ? (canceledCount / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

    // 5.3 Top Clientes Desde Sempre (Buscando agendamentos reais)
    const allTimeCounts = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: { tenant: { slug }, status: "COMPLETED" },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });
    
    const topClientIds = allTimeCounts.map(a => a.clientId);
    const clientsData = await prisma.client.findMany({
      where: { id: { in: topClientIds } },
      select: { id: true, name: true, noShowCount: true, lateCancelCount: true }
    });

    const topClientsAllTimeData = allTimeCounts.map(agg => {
      const c = clientsData.find(c => c.id === agg.clientId);
      return {
        name: c?.name || "Desconhecido",
        completedCount: agg._count.id,
        noShowCount: c?.noShowCount || 0,
        lateCancelCount: c?.lateCancelCount || 0
      };
    });

    // 1. Função auxiliar para pegar a data local (AAAA-MM-DD) sem erros
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 2. Gerar a lista dos últimos dias baseada na data LOCAL e no range selecionado
    const dynamicDays = [...Array(days)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return getLocalDateString(d);
    }).reverse();

    // 3. Montar o gráfico comparando as datas locais
    const chartData = dynamicDays.map(dateStr => {
      const dayTotal = completed
        .filter(a => {
          const appointmentDate = getLocalDateString(new Date(a.startAt));
          return appointmentDate === dateStr;
        })
        .reduce((sum, a) => sum + getAppointmentRevenueInCents(a), 0);

      // Criar o nome do dia (dom, seg...) ou a data curta se for mais de 7 dias
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      
      const label = days > 7 
        ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
        : dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

      return {
        date: label,
        faturamento: dayTotal,
      };
    });

    const detalheProfissionais: Record<string, {
      name: string;
      count: number;
      bruto: number;
      comissao: number;
    }> = {};
    completed.forEach((a) => {
      const profName = a.professional?.name || "Barbeiro";
      const preco = getAppointmentRevenueInCents(a);
      const taxa = a.professional?.commissionRate || 0;
      const comissao = (preco * taxa) / 100;

      if (!detalheProfissionais[profName]) {
        detalheProfissionais[profName] = {
          name: profName,
          count: 0,
          bruto: 0,
          comissao: 0
        };
      }

      detalheProfissionais[profName].count += 1;
      detalheProfissionais[profName].bruto += preco;
      detalheProfissionais[profName].comissao += comissao;
    });

    // 6. RETORNO NO FORMATO QUE O FRONTEND ESPERA (Tudo blindado)
    return NextResponse.json({
      summary: {
        totalAppointments,
        completedAppointments: completed.length,
        // Usando a.clientId que é mais seguro que clientPhone caso esteja vazio
        totalClients: new Set(appointments.map((a: any) => a.clientId || a.id)).size,
        totalRevenue: totalBruto,
        totalComissoes: totalComissoes,
        lucroLiquido: totalBruto - totalComissoes,
        totalClubDiscountInCents,
        cancellationRate,
        noShowRate,
      },
      chartData,
      topServices: Object.values(serviceMap).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5),
      topProfessionals: Object.values(professionalMap).sort((a: any, b: any) => b.count - a.count).slice(0, 5),
      topClientsPeriod: Object.values(clientPeriodMap).sort((a: any, b: any) => b.count - a.count).slice(0, 5),
      topClientsAllTime: topClientsAllTimeData,
      // 🔥 AQUI ESTAVA O BUG: Transformamos o Objeto em um Array para o React conseguir ler!
      detalheProfissionais: Object.values(detalheProfissionais),
    });

  } catch (error) {
    console.error("Erro na API de métricas:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}