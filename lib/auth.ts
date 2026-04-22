import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function getCurrentMembershipBySlug(slug: string) {
  const session = await getSession();

  if (!session?.userId) return null;

  return prisma.membership.findFirst({
    where: {
      userId: session.userId,
      tenant: { slug },
    },
    include: {
      tenant: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function requireTenantAccess(slug: string) {
  const membership = await getCurrentMembershipBySlug(slug);

  if (!membership) {
    redirect(`/login?next=${encodeURIComponent(`/admin/${slug}`)}`);
  }

  return membership;
}