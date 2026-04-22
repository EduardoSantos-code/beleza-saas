import { requireTenantAccess } from "@/lib/auth";
import InboxClient from "./InboxClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireTenantAccess(slug);

  return <InboxClient slug={slug} />;
}