import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getClientSession(slug);

    if (!session) {
      return NextResponse.json(
        { error: "Sessão expirada. Identifique-se novamente." },
        { status: 401 }
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: session.tenantId,
        clientId: session.clientId,
      },
      include: {
        service: {
          select: {
            name: true,
            durationMin: true,
            price: true,
          },
        },
        professional: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    return NextResponse.json({
      appointments,
      client: {
        phoneE164: session.phoneE164,
      },
    });
  } catch (error) {
    console.error("[PORTAL_APPOINTMENTS_GET]", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar agendamentos." },
      { status: 500 }
    );
  }
}
