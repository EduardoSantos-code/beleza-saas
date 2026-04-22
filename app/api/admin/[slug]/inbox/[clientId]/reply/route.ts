import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { logWhatsAppOutboundMessage } from "@/lib/whatsapp-log";
import { NextResponse } from "next/server";
import { z } from "zod";

const ReplySchema = z.object({
  text: z.string().min(1).max(2000),
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

    const [client, config] = await Promise.all([
      prisma.client.findFirst({
        where: {
          id: clientId,
          tenantId: membership.tenantId,
        },
        select: {
          id: true,
          name: true,
          phoneE164: true,
        },
      }),
      prisma.whatsappConfig.findUnique({
        where: {
          tenantId: membership.tenantId,
        },
      }),
    ]);

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: "WhatsApp não configurado para este salão" },
        { status: 400 }
      );
    }

    const waResponse = await sendWhatsAppText({
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken,
      to: client.phoneE164,
      text: parsed.data.text,
    });

    const waMessageId = waResponse?.messages?.[0]?.id ?? null;

    await logWhatsAppOutboundMessage({
      tenantId: membership.tenantId,
      clientId: client.id,
      phoneNumberId: config.phoneNumberId,
      toPhoneE164: client.phoneE164,
      textBody: parsed.data.text,
      waMessageId,
      rawJson: waResponse,
    });

    return NextResponse.json({
      ok: true,
      waMessageId,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/admin/[slug]/inbox/[clientId]/reply:", error);

    return NextResponse.json(
      { error: error?.message || "Erro interno ao enviar resposta" },
      { status: 500 }
    );
  }
}