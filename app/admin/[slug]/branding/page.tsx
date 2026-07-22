import { requireManagerAccess } from "@/lib/auth";
import BrandingClient from "./BrandingClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireManagerAccess(slug);

  return <BrandingClient slug={slug} />;
}