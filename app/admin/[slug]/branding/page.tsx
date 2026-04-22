import { requireTenantAccess } from "@/lib/auth";
import BrandingClient from "./BrandingClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <BrandingClient slug={slug} />;
}