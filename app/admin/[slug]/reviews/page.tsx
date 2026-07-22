import { requireManagerAccess } from "@/lib/auth";
import AdminReviewsClient from "./AdminReviewsClient";

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireManagerAccess(slug);
  return <AdminReviewsClient />;
}
