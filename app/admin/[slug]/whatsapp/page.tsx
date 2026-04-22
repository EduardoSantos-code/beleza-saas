import { requireTenantAccess } from "@/lib/auth";
import WhatsappSettingsClient from "./WhatsappSettingsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <WhatsappSettingsClient slug={slug} />;
}