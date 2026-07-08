import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function getCurrentMembershipBySlug(slug: string) {
  const session = await getSession();

  if (!session?.userId) return null;

  const [tenant, dbUser] = await Promise.all([
    prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        planStatus: true,
        subscriptionStatus: true,
        createdAt: true,
        planTier: true,
        planCycle: true,
      },
    }),
    session.role
      ? Promise.resolve(null)
      : prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        }),
  ]);

  if (!tenant) return null;

  const effectiveRole = session.role || dbUser?.role;

  if (effectiveRole === "MASTER") {
    return {
      id: `master-${tenant.id}`,
      userId: session.userId,
      tenantId: tenant.id,
      role: "MASTER",
      createdAt: tenant.createdAt,
      tenant,
      user: {
        id: session.userId,
        name: session.name ?? dbUser?.name ?? "Master",
        email: session.email ?? dbUser?.email ?? null,
        role: "MASTER",
      },
      isMasterBypass: true,
    };
  }

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
          role: true,
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
