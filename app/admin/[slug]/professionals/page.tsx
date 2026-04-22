import { requireTenantAccess } from "@/lib/auth";
import ProfessionalsClient from "./ProfessionalsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <ProfessionalsClient slug={slug} />;
}