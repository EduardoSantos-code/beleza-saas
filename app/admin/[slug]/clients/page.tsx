import { requireTenantAccess } from "@/lib/auth";
import ClientsClient from "./ClientsClient";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireTenantAccess(slug);
  return <ClientsClient slug={slug} />;
}
