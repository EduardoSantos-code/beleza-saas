import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ slug: string; clientId: string }>;
  }
) {
  try {
    const { slug, clientId } = await params;

    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: membership.tenantId,
      },
      select: {
        id: true,
        name: true,
        phoneE164: true,
        inboundMessages: {
          select: {
            id: true,
            waMessageId: true,
            textBody: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        outboundMessages: {
          select: {
            id: true,
            waMessageId: true,
            textBody: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const messages = [
      ...client.inboundMessages.map((message) => ({
        id: `in_${message.id}`,
        direction: "inbound" as const,
        textBody: message.textBody || "[mensagem sem texto]",
        type: message.type,
        waMessageId: message.waMessageId,
        createdAt: message.createdAt,
      })),
      ...client.outboundMessages.map((message) => ({
        id: `out_${message.id}`,
        direction: "outbound" as const,
        textBody: message.textBody,
        type: "TEXT",
        waMessageId: message.waMessageId,
        createdAt: message.createdAt,
      })),
    ].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        phoneE164: client.phoneE164,
      },
      messages,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/inbox/[clientId]:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar conversa" },
      { status: 500 }
    );
  }
}