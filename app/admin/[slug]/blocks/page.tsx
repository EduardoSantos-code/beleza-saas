import { requireTenantAccess } from "@/lib/auth";
import BlocksClient from "./BlocksClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <BlocksClient slug={slug} />;
}