import { requireTenantAccess } from "@/lib/auth";
import BillingClient from "./BillingClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <BillingClient slug={slug} />;
}