import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

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
      },
    });

    console.log(`✅ Encontrados ${appointments.length} agendamentos para este período.`);

    let totalBruto = 0;
    let totalComissoes = 0;

    const completed = appointments.filter((a) => a.status === "COMPLETED");
    completed.forEach((a: any) => {
      console.log(`🕵️ Data REAL do Agendamento: ${a.startAt}`);
    });

    completed.forEach((a: any) => {
      const preco = a.service?.price || 0;
      const taxa = a.professional?.commissionRate || 0;

      const comissao = (preco * taxa) / 100;

      totalBruto += preco;
      totalComissoes += comissao;
    });

    // 4. Agrupar Top Serviços
    const serviceMap: Record<string, any> = {};
    completed.forEach((a: any) => {
      console.log(`💰 Agendamento ID: ${a.id} | Serviço: ${a.service?.name} | Preço no Banco: ${a.service?.price}`);
      const name = a.service?.name || "Outros";
      if (!serviceMap[name]) serviceMap[name] = { name, count: 0, revenue: 0 };
      serviceMap[name].count++;
      serviceMap[name].revenue += (a.service?.price || 0);
    });

    // 5. Agrupar Performance Profissionais
    const professionalMap: Record<string, any> = {};
    completed.forEach((a: any) => {
      const name = a.professional?.name || "Desconhecido";
      if (!professionalMap[name]) professionalMap[name] = { name, count: 0 };
      professionalMap[name].count++;
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
        .reduce((sum, a: any) => sum + (a.service?.price || 0), 0);

      // Criar o nome do dia (dom, seg...) ou a data curta se for mais de 7 dias
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      
      const label = days > 7 
        ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
        : dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

      return {
        date: label,
        faturamento: dayTotal / 100,
      };
    });

    const detalheProfissionais: Record<string, any> = {};
    completed.forEach((a: any) => {
      const profName = a.professional?.name || "Barbeiro";
      const preco = a.service?.price || 0;
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

    // 6. RETORNO NO FORMATO QUE O FRONTEND ESPERA
    return NextResponse.json({
      summary: {
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        totalClients: new Set(appointments.map((a: any) => a.clientPhone || a.id)).size,
        totalRevenue: totalBruto,
        totalComissoes: totalComissoes,
        lucroLiquido: totalBruto - totalComissoes,
      },
      chartData,
      topServices: Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topProfessionals: Object.values(professionalMap).sort((a, b) => b.count - a.count).slice(0, 5),
      detalheProfissionais,
    });

  } catch (error) {
    console.error("Erro na API de métricas:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}