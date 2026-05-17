import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";

function isValidClubPaymentProvider(
  value: unknown
): value is "ASAAS" | "MERCADO_PAGO" {
  return value === "ASAAS" || value === "MERCADO_PAGO";
}

function isValidAsaasEnvironment(
  value: unknown
): value is "SANDBOX" | "PRODUCTION" {
  return value === "SANDBOX" || value === "PRODUCTION";
}

function isValidMercadoPagoEnvironment(
  value: unknown
): value is "SANDBOX" | "PRODUCTION" {
  return value === "SANDBOX" || value === "PRODUCTION";
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        clubPaymentProvider: true,
        clubAsaasApiKeyEnc: true,
        clubAsaasEnvironment: true,
        clubMercadoPagoAccessTokenEnc: true,
        clubMercadoPagoPublicKey: true,
        clubMercadoPagoEnvironment: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      clubPaymentProvider: tenant.clubPaymentProvider,
      asaas: {
        configured: Boolean(tenant.clubAsaasApiKeyEnc),
        environment: tenant.clubAsaasEnvironment,
      },
      mercadoPago: {
        configured: Boolean(tenant.clubMercadoPagoAccessTokenEnc),
        publicKeyConfigured: Boolean(tenant.clubMercadoPagoPublicKey),
        environment: tenant.clubMercadoPagoEnvironment,
      },
    });
  } catch (error) {
    console.error("[CLUB_PAYMENT_GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireTenantAccess(slug);

    const body = (await request.json()) as {
      clubPaymentProvider?: unknown;
      asaasApiKey?: unknown;
      asaasEnvironment?: unknown;
      mercadoPagoAccessToken?: unknown;
      mercadoPagoPublicKey?: unknown;
      mercadoPagoEnvironment?: unknown;
    };

    const clubPaymentProvider = body.clubPaymentProvider;
    const asaasApiKey = nonEmptyString(body.asaasApiKey);
    const asaasEnvironment = body.asaasEnvironment;
    const mercadoPagoAccessToken = nonEmptyString(body.mercadoPagoAccessToken);
    const mercadoPagoPublicKey = nonEmptyString(body.mercadoPagoPublicKey);
    const mercadoPagoEnvironment = body.mercadoPagoEnvironment;

    if (
      clubPaymentProvider !== undefined &&
      clubPaymentProvider !== null &&
      !isValidClubPaymentProvider(clubPaymentProvider)
    ) {
      return NextResponse.json(
        { error: "Provedor de pagamento inválido" },
        { status: 400 }
      );
    }

    if (
      asaasEnvironment !== undefined &&
      asaasEnvironment !== null &&
      !isValidAsaasEnvironment(asaasEnvironment)
    ) {
      return NextResponse.json(
        { error: "Ambiente Asaas inválido" },
        { status: 400 }
      );
    }

    if (
      mercadoPagoEnvironment !== undefined &&
      mercadoPagoEnvironment !== null &&
      !isValidMercadoPagoEnvironment(mercadoPagoEnvironment)
    ) {
      return NextResponse.json(
        { error: "Ambiente do Mercado Pago inválido" },
        { status: 400 }
      );
    }

    if (asaasApiKey && asaasApiKey.length < 20) {
      return NextResponse.json(
        {
          error: "A chave de API do Asaas deve ter pelo menos 20 caracteres",
        },
        { status: 400 }
      );
    }

    if (mercadoPagoAccessToken && mercadoPagoAccessToken.length < 20) {
      return NextResponse.json(
        {
          error:
            "O access token do Mercado Pago deve ter pelo menos 20 caracteres",
        },
        { status: 400 }
      );
    }

    if (mercadoPagoPublicKey && mercadoPagoPublicKey.length < 10) {
      return NextResponse.json(
        {
          error:
            "A public key do Mercado Pago deve ter pelo menos 10 caracteres",
        },
        { status: 400 }
      );
    }

    const updateData: Prisma.TenantUpdateInput = {};

    if (clubPaymentProvider !== undefined && clubPaymentProvider !== null) {
      updateData.clubPaymentProvider = clubPaymentProvider;
    }

    if (asaasEnvironment !== undefined && asaasEnvironment !== null) {
      updateData.clubAsaasEnvironment = asaasEnvironment;
    }

    if (mercadoPagoEnvironment !== undefined && mercadoPagoEnvironment !== null) {
      updateData.clubMercadoPagoEnvironment = mercadoPagoEnvironment;
    }

    if (asaasApiKey) {
      updateData.clubAsaasApiKeyEnc = encryptSecret(asaasApiKey);
    }

    if (mercadoPagoAccessToken) {
      updateData.clubMercadoPagoAccessTokenEnc =
        encryptSecret(mercadoPagoAccessToken);
    }

    if (mercadoPagoPublicKey) {
      updateData.clubMercadoPagoPublicKey = mercadoPagoPublicKey;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { slug },
      data: updateData,
      select: {
        clubPaymentProvider: true,
        clubAsaasApiKeyEnc: true,
        clubAsaasEnvironment: true,
        clubMercadoPagoAccessTokenEnc: true,
        clubMercadoPagoPublicKey: true,
        clubMercadoPagoEnvironment: true,
      },
    });

    return NextResponse.json({
      ok: true,
      clubPaymentProvider: updatedTenant.clubPaymentProvider,
      asaas: {
        configured: Boolean(updatedTenant.clubAsaasApiKeyEnc),
        environment: updatedTenant.clubAsaasEnvironment,
      },
      mercadoPago: {
        configured: Boolean(updatedTenant.clubMercadoPagoAccessTokenEnc),
        publicKeyConfigured: Boolean(updatedTenant.clubMercadoPagoPublicKey),
        environment: updatedTenant.clubMercadoPagoEnvironment,
      },
    });
  } catch (error) {
    console.error("[CLUB_PAYMENT_PATCH]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
