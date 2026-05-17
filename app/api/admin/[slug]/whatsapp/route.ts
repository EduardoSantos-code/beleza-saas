import { prisma } from "@/lib/prisma";
import { getCurrentMembershipBySlug } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  buildTenantInstanceName,
  connectInstance,
  ensureInstanceCreated,
  extractPairingCode,
  extractQrCodeBase64,
  extractQrCodeText,
  getAppBaseUrl,
  getConnectionState,
  resolveConnectionStatus,
} from "@/lib/evolution";

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

    const config = await prisma.whatsappConfig.findUnique({
      where: { tenantId: membership.tenantId },
    });

    if (!config) {
      return NextResponse.json({
        tenant: {
          id: membership.tenant.id,
          name: membership.tenant.name,
        },
        config: null,
      });
    }

    let liveStatus = config.status;

    if (config.instanceName) {
      try {
        const statePayload = await getConnectionState(config.instanceName);
        liveStatus = resolveConnectionStatus(statePayload);

        if (liveStatus !== config.status) {
          await prisma.whatsappConfig.update({
            where: { tenantId: membership.tenantId },
            data: {
              status: liveStatus,
              ...(liveStatus === "OPEN"
                ? { lastConnectionAt: new Date() }
                : {}),
            },
          });
        }
      } catch (error) {
        console.error("[WHATSAPP_GET_STATUS_ERROR]", error);
      }
    }

    const freshConfig = await prisma.whatsappConfig.findUnique({
      where: { tenantId: membership.tenantId },
    });

    return NextResponse.json({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
      },
      config: freshConfig
        ? {
            id: freshConfig.id,
            provider: freshConfig.provider,
            instanceName: freshConfig.instanceName,
            status: freshConfig.status || liveStatus,
            connectedPhone: freshConfig.connectedPhone,
            profileName: freshConfig.profileName,
            qrCodeBase64: freshConfig.qrCodeBase64,
            qrCodeText: freshConfig.qrCodeText,
            pairingCode: freshConfig.pairingCode,
            updatedAt: freshConfig.updatedAt,
            lastConnectionAt: freshConfig.lastConnectionAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro em GET /api/admin/[slug]/whatsapp:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar configuração do WhatsApp" },
      { status: 500 }
    );
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const membership = await getCurrentMembershipBySlug(slug);

    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const appBaseUrl = getAppBaseUrl();

    if (!appBaseUrl) {
      return NextResponse.json(
        {
          error:
            "APP_URL, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL ou VERCEL_URL não configurado",
        },
        { status: 500 }
      );
    }

    const webhookUrl = `${appBaseUrl}/api/webhooks/whatsapp`;

    const existing = await prisma.whatsappConfig.findUnique({
      where: { tenantId: membership.tenantId },
    });

    const instanceName =
      existing?.instanceName ||
      buildTenantInstanceName(slug, membership.tenantId);

    // 1) cria/garante a instância
    await ensureInstanceCreated(instanceName, webhookUrl);

    // 2) NÃO chama setInstanceWebhook por enquanto
    // sua Evolution está falhando exatamente nesse endpoint

    // 3) pede QR / connect
    const connectPayload = await connectInstance(instanceName);

    const qrCodeBase64 = extractQrCodeBase64(connectPayload);
    const qrCodeText = extractQrCodeText(connectPayload);
    const pairingCode = extractPairingCode(connectPayload);

    const config = await prisma.whatsappConfig.upsert({
      where: { tenantId: membership.tenantId },
      update: {
        provider: "EVOLUTION",
        instanceName,
        status: "CONNECTING",
        qrCodeBase64,
        qrCodeText,
        pairingCode,
      },
      create: {
        tenantId: membership.tenantId,
        provider: "EVOLUTION",
        instanceName,
        status: "CONNECTING",
        qrCodeBase64,
        qrCodeText,
        pairingCode,
      },
    });

    return NextResponse.json({
      ok: true,
      warning:
        "Webhook automático pulado temporariamente por incompatibilidade da sua Evolution. A conexão e o envio podem seguir.",
      config: {
        id: config.id,
        provider: config.provider,
        instanceName: config.instanceName,
        status: config.status,
        qrCodeBase64: config.qrCodeBase64,
        qrCodeText: config.qrCodeText,
        pairingCode: config.pairingCode,
      },
    });
  } catch (error: any) {
    console.error("Erro em POST /api/admin/[slug]/whatsapp:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao conectar instância do WhatsApp",
      },
      { status: 500 }
    );
  }
}
