import ManageAppointmentClient from "./ManageAppointmentClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return <ManageAppointmentClient slug={slug} id={id} />;
}