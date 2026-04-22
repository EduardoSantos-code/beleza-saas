import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);

  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: "date é obrigatório" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
  }

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      startAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      client: true,
      service: true,
      professional: true,
    },
    orderBy: {
      startAt: "asc",
    },
  });

  return NextResponse.json({
    tenant,
    appointments: appointments.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      notes: a.notes,
      client: {
        name: a.client.name,
        phoneE164: a.client.phoneE164,
      },
      service: {
        name: a.service.name,
        priceCents: a.service.priceCents,
        durationMin: a.service.durationMin,
      },
      professional: {
        name: a.professional.name,
      },
    })),
  });
}