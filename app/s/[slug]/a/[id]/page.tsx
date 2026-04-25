// app/s/[slug]/a/[id]/page.tsx

import AppointmentSuccessPage from "./ManageAppointmentClient"; // ou o nome que você deu

export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  // O SEGREDO: Você PRECISA dar await nos params antes de passar para o componente
  const { slug, id } = await params;

  return <AppointmentSuccessPage slug={slug} id={id} />;
}