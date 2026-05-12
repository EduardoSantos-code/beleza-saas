import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantAccess } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";

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
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      clubPaymentProvider: tenant.clubPaymentProvider,
      asaas: {
        configured: Boolean(tenant.clubAsaasApiKeyEnc),
        environment: tenant.clubAsaasEnvironment,
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

    const body = await request.json();
    const { clubPaymentProvider, asaasApiKey, asaasEnvironment } = body;

    // Validações
    if (
      clubPaymentProvider &&
      !["ASAAS", "MERCADO_PAGO"].includes(clubPaymentProvider)
    ) {
      return NextResponse.json(
        { error: "Provedor de pagamento inválido" },
        { status: 400 }
      );
    }

    if (
      asaasEnvironment &&
      !["SANDBOX", "PRODUCTION"].includes(asaasEnvironment)
    ) {
      return NextResponse.json(
        { error: "Ambiente Asaas inválido" },
        { status: 400 }
      );
    }

    if (asaasApiKey && asaasApiKey.length < 20) {
      return NextResponse.json(
        { error: "A chave de API do Asaas deve ter pelo menos 20 caracteres" },
        { status: 400 }
      );
    }

    const updateData: {
      clubPaymentProvider?: "ASAAS" | "MERCADO_PAGO";
      clubAsaasEnvironment?: "SANDBOX" | "PRODUCTION";
      clubAsaasApiKeyEnc?: string;
    } = {};

    if (clubPaymentProvider) updateData.clubPaymentProvider = clubPaymentProvider;
    if (asaasEnvironment) updateData.clubAsaasEnvironment = asaasEnvironment;
    
    if (asaasApiKey) {
      updateData.clubAsaasApiKeyEnc = encryptSecret(asaasApiKey);
    }

    const updatedTenant = await prisma.tenant.update({
      where: { slug },
      data: updateData,
      select: {
        clubPaymentProvider: true,
        clubAsaasApiKeyEnc: true,
        clubAsaasEnvironment: true,
      },
    });

    return NextResponse.json({
      ok: true,
      clubPaymentProvider: updatedTenant.clubPaymentProvider,
      asaas: {
        configured: Boolean(updatedTenant.clubAsaasApiKeyEnc),
        environment: updatedTenant.clubAsaasEnvironment,
      },
    });
  } catch (error) {
    console.error("[CLUB_PAYMENT_PATCH]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";