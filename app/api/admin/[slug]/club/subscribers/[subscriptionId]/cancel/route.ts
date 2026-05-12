import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { deleteAsaasSubscription, ClubAsaasEnvironment } from "@/lib/asaas-club";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; subscriptionId: string }> }
) {
  try {
    const { slug, subscriptionId } = await params;

    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        clubAsaasApiKeyEnc: true,
        clubAsaasEnvironment: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const subscription = await prisma.clubSubscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status === "CANCELED") {
      return NextResponse.json({
        ok: true,
        gatewayCanceled: false,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          canceledAt: subscription.canceledAt,
          client: {
            name: subscription.client.name,
            phoneE164: subscription.client.phoneE164,
          },
          plan: {
            name: subscription.plan.name,
          },
        },
      });
    }

    let gatewayCanceled = false;

    if (subscription.provider === "MERCADO_PAGO") {
      return NextResponse.json(
        { error: "Cancelamento via Mercado Pago ainda não implementado." },
        { status: 400 }
      );
    }

    if (subscription.provider === "ASAAS" && subscription.providerSubscriptionId) {
      if (!tenant.clubAsaasApiKeyEnc) {
        return NextResponse.json(
          { error: "Chave Asaas do clube não configurada. Não foi possível cancelar no gateway." },
          { status: 400 }
        );
      }

      try {
        const apiKey = decryptSecret(tenant.clubAsaasApiKeyEnc);
        await deleteAsaasSubscription({
          apiKey,
          environment: tenant.clubAsaasEnvironment as ClubAsaasEnvironment,
          subscriptionId: subscription.providerSubscriptionId,
        });
        gatewayCanceled = true;
      } catch (asaasError) {
        console.error("[ASAAS_CANCEL_ERROR]", asaasError instanceof Error ? asaasError.message : String(asaasError));
        return NextResponse.json(
          { error: "Não foi possível cancelar a assinatura no Asaas. Tente novamente ou verifique a configuração da chave." },
          { status: 400 }
        );
      }
    }

    const updatedSubscription = await prisma.clubSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
      include: {
        client: true,
        plan: true,
      },
    });

    return NextResponse.json({
      ok: true,
      gatewayCanceled,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        canceledAt: updatedSubscription.canceledAt,
        client: {
          name: updatedSubscription.client.name,
          phoneE164: updatedSubscription.client.phoneE164,
        },
        plan: {
          name: updatedSubscription.plan.name,
        },
      },
    });
  } catch (error) {
    console.error("[CANCEL_SUBSCRIPTION_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}