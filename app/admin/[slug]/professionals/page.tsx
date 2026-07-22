import { requireManagerAccess } from "@/lib/auth";
import ProfessionalsClient from "./ProfessionalsClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireManagerAccess(slug);

  return <ProfessionalsClient slug={slug} />;
}