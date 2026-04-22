import { requireTenantAccess } from "@/lib/auth";
import ServicesClient from "./ServicesClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <ServicesClient slug={slug} />;
}