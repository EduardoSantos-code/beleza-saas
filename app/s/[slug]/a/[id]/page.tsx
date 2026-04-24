import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  // 1. Pega as informações da URL (slug e id)
  const { slug, id } = await params;

  // 2. Busca o agendamento no banco de dados
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      tenant: true,
      service: true,
      professional: true,
      client: true,
    },
  });

  // Se não achar o agendamento, mostra erro 404
  if (!appointment) {
    return notFound();
  }

  // 3. CONFIGURAÇÃO DE FUSO HORÁRIO BRASÍLIA (AMERICA/SAO_PAULO)
  const dateLabel = appointment.startAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  const timeLabel = appointment.startAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const primaryColor = appointment.tenant.primaryColor || "#7c3aed";

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Cabeçalho */}
        <div className="p-8 text-center border-b border-zinc-800">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {appointment.tenant.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-black text-white">{appointment.tenant.name}</h1>
          <p className="text-zinc-500 text-sm mt-1">Recibo de Agendamento</p>
        </div>

        {/* Detalhes com Horário de Brasília */}
        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">📅</div>
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Data</p>
              <p className="text-white font-bold">{dateLabel}</p>
              <p className="text-violet-400 font-bold text-lg">{timeLabel}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">✂️</div>
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Serviço</p>
              <p className="text-white font-bold">{appointment.service.name}</p>
              <p className="text-zinc-400 text-sm">R$ {(appointment.service.priceCents / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">👤</div>
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Profissional</p>
              <p className="text-white font-bold">{appointment.professional.name}</p>
            </div>
          </div>
        </div>

        {/* Botão para Novo Agendamento */}
        <div className="p-6 bg-zinc-800/30">
          <Link 
            href={`/${slug}`}
            className="block w-full py-4 text-center rounded-2xl font-black text-sm uppercase tracking-widest transition hover:brightness-110"
            style={{ backgroundColor: primaryColor, color: '#fff' }}
          >
            Fazer outro agendamento
          </Link>
          <p className="text-[10px] text-zinc-600 text-center mt-4 uppercase tracking-tighter">
            TratoMarcado • Seu horário está garantido!
          </p>
        </div>
      </div>
    </main>
  );
}