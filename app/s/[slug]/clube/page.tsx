import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClubPublicPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/s/${slug}?tab=clube`);
}