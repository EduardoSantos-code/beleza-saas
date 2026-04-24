import ManageAppointmentClient from "./ManageAppointmentClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  // Pega as informações da URL de forma segura
  const { slug, id } = await params;

  // Envia essas informações para o componente de design acima
  return <ManageAppointmentClient slug={slug} id={id} />;
}