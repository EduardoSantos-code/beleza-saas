import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: clientId } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
    }

    // Verificar se o cliente existe e pertence a este salão
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: tenant.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    // Buscar histórico de agendamentos ordenados por data de início de forma decrescente
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId: client.id,
        tenantId: tenant.id
      },
      include: {
        professional: {
          select: {
            name: true
          }
        },
        service: {
          select: {
            name: true,
            price: true,
            durationMin: true
          }
        }
      },
      orderBy: {
        startAt: "desc"
      }
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Erro ao buscar histórico de agendamentos:", error);
    return NextResponse.json({ error: "Erro interno ao buscar agendamentos" }, { status: 500 });
  }
}
