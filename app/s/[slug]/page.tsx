import BookingPageClient from "./BookingPageClient";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  if (!tenant) {
    return { title: "Não encontrado | TratoMarcado" };
  }

  return {
    title: `${tenant.name} | TratoMarcado`,
    description: `Agendamento online para ${tenant.name}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BookingPageClient slug={slug} />;
}