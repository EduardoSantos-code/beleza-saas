import { requireTenantAccess } from "@/lib/auth";
import HoursSettingsClient from "./HoursSettingsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <HoursSettingsClient slug={slug} />;
}