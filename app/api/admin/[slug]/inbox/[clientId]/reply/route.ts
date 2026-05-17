import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { z } from "zod";

const ReplySchema = z.object({
  text: z.string().min(1).max(2000),
  replyToMessageId: z.string().optional(),
});

export async function POST(
  req: Request,
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

    const body = await req.json();
    const parsed = ReplySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Mensagem inválida" },
        { status: 400 }
      );
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
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (!client.phoneE164) {
      return NextResponse.json(
        { error: "Cliente sem telefone cadastrado" },
        { status: 400 }
      );
    }

    try {
      const waResponse = await sendTenantWhatsAppMessage({
        tenantId: membership.tenantId,
        clientId: client.id,
        to: client.phoneE164,
        text: parsed.data.text,
        replyToMessageId: parsed.data.replyToMessageId,
      });

      if (!waResponse.success) {
        console.error(
          "[INBOX_REPLY_WHATSAPP_TEMPORARY_FAILURE]",
          waResponse.reason,
          waResponse.data
        );

        return NextResponse.json(
          {
            error: "Falha temporária ao enviar mensagem no WhatsApp",
            reason: waResponse.reason,
          },
          { status: waResponse.status || 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        waMessageId: waResponse.messages?.[0]?.id ?? null,
      });
    } catch (waError: any) {
      console.error("[INBOX_REPLY_WHATSAPP_TEMPORARY_FAILURE]", waError);

      return NextResponse.json(
        {
          error: waError?.message || "Erro temporário ao enviar resposta",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(
      "Erro em POST /api/admin/[slug]/inbox/[clientId]/reply:",
      error
    );

    return NextResponse.json(
      { error: error?.message || "Erro interno ao enviar resposta" },
      { status: 500 }
    );
  }
}
