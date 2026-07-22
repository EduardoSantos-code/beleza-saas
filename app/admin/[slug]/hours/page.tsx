import { requireManagerAccess } from "@/lib/auth";
import HoursSettingsClient from "./HoursSettingsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireManagerAccess(slug);

  return <HoursSettingsClient slug={slug} />;
}