import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getClubBillingProviderFromTenant } from "@/lib/club-billing";

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
        name: true,
        slug: true,
        clubAsaasApiKeyEnc: true,
        clubAsaasEnvironment: true,
        clubMercadoPagoAccessTokenEnc: true,
        clubMercadoPagoPublicKey: true,
        clubMercadoPagoEnvironment: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant não encontrado." },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "Assinatura não encontrada." },
        { status: 404 }
      );
    }

    if (subscription.status === "CANCELED") {
      return NextResponse.json({
        ok: true,
        gatewayCanceled: false,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          canceledAt: subscription.canceledAt,
          provider: subscription.provider,
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
    let providerStatusRaw: string | null = subscription.providerStatusRaw ?? null;
    let canceledAt = new Date();

    if (subscription.providerSubscriptionId) {
      let providerSetup:
        | ReturnType<typeof getClubBillingProviderFromTenant>
        | undefined;

      try {
        providerSetup = getClubBillingProviderFromTenant(
          {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            clubPaymentProvider: subscription.provider,
            clubAsaasEnvironment: tenant.clubAsaasEnvironment,
            clubMercadoPagoEnvironment: tenant.clubMercadoPagoEnvironment,
          },
          {
            asaasApiKey: tenant.clubAsaasApiKeyEnc
              ? decryptSecret(tenant.clubAsaasApiKeyEnc)
              : null,
            mercadoPagoAccessToken: tenant.clubMercadoPagoAccessTokenEnc
              ? decryptSecret(tenant.clubMercadoPagoAccessTokenEnc)
              : null,
            mercadoPagoPublicKey: tenant.clubMercadoPagoPublicKey,
          }
        );
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Configuração do gateway inválida.",
          },
          { status: 400 }
        );
      }

      try {
        const cancelResult = await providerSetup.adapter.cancelSubscription({
          providerConfig: providerSetup.config,
          providerSubscriptionId: subscription.providerSubscriptionId,
          reason: "Cancelado pelo administrador do tenant.",
        });

        gatewayCanceled = cancelResult.canceled;
        providerStatusRaw =
          cancelResult.providerStatusRaw ?? providerStatusRaw ?? null;
        canceledAt = cancelResult.canceledAt ?? canceledAt;
      } catch (gatewayError) {
        console.error(
          "[CLUB_PROVIDER_CANCEL_ERROR]",
          gatewayError instanceof Error
            ? gatewayError.message
            : String(gatewayError)
        );

        return NextResponse.json(
          {
            error:
              "Não foi possível cancelar a assinatura no gateway. Verifique a configuração e tente novamente.",
          },
          { status: 400 }
        );
      }
    }

    const updatedSubscription = await prisma.clubSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED",
        canceledAt,
        providerStatusRaw,
        lastProviderSyncAt: new Date(),
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
        provider: updatedSubscription.provider,
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
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
