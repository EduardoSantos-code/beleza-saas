import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { sendTenantWhatsAppMessage } from "@/lib/whatsapp";
import { NextResponse } from "next/server";
import { z } from "zod";

const TestSchema = z.object({
  to: z.string().regex(/^\+\d{10,15}$/),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = TestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Número inválido. Use formato +5511999999999" },
        { status: 400 }
      );
    }

    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId: membership.tenantId },
    });

    if (!config?.instanceName) {
      return NextResponse.json(
        { error: "WhatsApp ainda não configurado" },
        { status: 400 }
      );
    }

    const result = await sendTenantWhatsAppMessage({
      tenantId: membership.tenantId,
      to: parsed.data.to,
      text: `Mensagem de teste da ${membership.tenant.name}. Sua integração com WhatsApp está funcionando.`,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Falha ao enviar mensagem de teste",
          reason: result.reason,
          details: result.data,
        },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error("Erro em POST /api/admin/[slug]/whatsapp/test:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao testar WhatsApp" },
      { status: 500 }
    );
  }
}
