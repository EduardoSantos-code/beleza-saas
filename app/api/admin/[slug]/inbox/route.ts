import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      where: {
        tenantId: membership.tenantId,
        OR: [
          { inboundMessages: { some: {} } },
          { outboundMessages: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        phoneE164: true,
        inboundMessages: {
          select: {
            id: true,
            textBody: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        outboundMessages: {
          select: {
            id: true,
            textBody: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    const conversations = clients
      .map((client) => {
        const lastInbound = client.inboundMessages[0] || null;
        const lastOutbound = client.outboundMessages[0] || null;

        const lastMessage =
          !lastInbound && !lastOutbound
            ? null
            : !lastOutbound
            ? {
                direction: "inbound" as const,
                textBody: lastInbound?.textBody || "",
                createdAt: lastInbound?.createdAt,
              }
            : !lastInbound
            ? {
                direction: "outbound" as const,
                textBody: lastOutbound?.textBody || "",
                createdAt: lastOutbound?.createdAt,
              }
            : lastInbound.createdAt > lastOutbound.createdAt
            ? {
                direction: "inbound" as const,
                textBody: lastInbound.textBody || "",
                createdAt: lastInbound.createdAt,
              }
            : {
                direction: "outbound" as const,
                textBody: lastOutbound.textBody || "",
                createdAt: lastOutbound.createdAt,
              };

        return {
          clientId: client.id,
          clientName: client.name,
          phoneE164: client.phoneE164,
          lastMessage,
        };
      })
      .filter((item) => item.lastMessage)
      .sort((a, b) => {
        const aTime = new Date(a.lastMessage!.createdAt).getTime();
        const bTime = new Date(b.lastMessage!.createdAt).getTime();
        return bTime - aTime;
      });

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      conversations,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/inbox:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar conversas" },
      { status: 500 }
    );
  }
}