import BookingPageClient from "./BookingPageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BookingPageClient slug={slug} />;
}