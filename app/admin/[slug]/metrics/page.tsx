import { requireTenantAccess } from "@/lib/auth";
import MetricsClient from "./MetricsClient";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireTenantAccess(slug);
  return <MetricsClient slug={slug} />;
}