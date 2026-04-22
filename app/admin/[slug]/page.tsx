import { requireTenantAccess } from "@/lib/auth";
import AdminAppointmentsClient from "./AdminAppointmentsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);
  
  return <AdminAppointmentsClient slug={slug} />;
}