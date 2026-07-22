import { requireManagerAccess } from "@/lib/auth";
import ServicesClient from "./ServicesClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireManagerAccess(slug);

  return <ServicesClient slug={slug} />;
}