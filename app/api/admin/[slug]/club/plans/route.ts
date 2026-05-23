import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/lib/auth'; // Ajuste o import conforme o padrão do projeto

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
        name: true,
        slug: true,
        clubEnabled: true,
        clubPaymentProvider: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const plans = await prisma.clubPlan.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        terms: true,
        priceInCents: true,
        billingCycle: true,
        discountPercent: true,
        isActive: true,
        includedServiceId: true,
        includedUsesPerPeriod: true,
        includedBenefitType: true,
        includedService: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      tenant,
      plans,
    });
  } catch (error) {
    console.error('[CLUB_PLANS_GET]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      terms,
      priceInCents,
      billingCycle = 'MONTHLY',
      discountPercent,
      isActive = true,
      includedServiceId,
      includedUsesPerPeriod,
      includedBenefitType,
    } = body;

    // Validações
    if (!name || typeof name !== 'string' || name.length < 2) {
      return NextResponse.json({ error: 'Nome obrigatório (mínimo 2 caracteres)' }, { status: 400 });
    }

    if (!Number.isInteger(priceInCents) || priceInCents <= 0) {
      return NextResponse.json({ error: 'Preço deve ser um número inteiro maior que 0' }, { status: 400 });
    }

    const validCycles = ['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY'];
    if (!validCycles.includes(billingCycle)) {
      return NextResponse.json({ error: 'Ciclo de faturamento inválido' }, { status: 400 });
    }

    if (discountPercent !== null && discountPercent !== undefined) {
      const discount = Number(discountPercent);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return NextResponse.json({ error: 'Desconto deve ser entre 0 e 100' }, { status: 400 });
      }
    }

    // Validações de Benefícios
    let finalIncludedServiceId = includedServiceId || null;
    let finalIncludedBenefitType = includedBenefitType || null;
    let finalIncludedUsesPerPeriod = Number(includedUsesPerPeriod) || 0;

    if (finalIncludedUsesPerPeriod !== 0) {
      if (!finalIncludedServiceId) {
        return NextResponse.json({ error: 'Serviço incluso é obrigatório para benefícios' }, { status: 400 });
      }
      if (finalIncludedBenefitType !== 'FREE_SERVICE') {
        return NextResponse.json({ error: 'Tipo de benefício inválido' }, { status: 400 });
      }
    } else {
      finalIncludedServiceId = null;
      finalIncludedBenefitType = null;
      finalIncludedUsesPerPeriod = 0;
    }

    if (finalIncludedServiceId) {
      const service = await prisma.service.findFirst({
        where: { id: finalIncludedServiceId, tenantId: tenant.id },
      });

      if (!service) {
        return NextResponse.json({ error: 'Serviço não encontrado ou não pertence a este estabelecimento' }, { status: 400 });
      }
    }

    // Criar plano e atualizar tenant se necessário
    const [newPlan] = await prisma.$transaction([
      prisma.clubPlan.create({
        data: {
          tenantId: tenant.id,
          name,
          description: description || null,
          terms: terms || null,
          priceInCents,
          billingCycle,
          discountPercent: discountPercent !== null ? Number(discountPercent) : null,
          isActive: Boolean(isActive),
          includedServiceId: finalIncludedServiceId,
          includedUsesPerPeriod: finalIncludedUsesPerPeriod,
          includedBenefitType: finalIncludedBenefitType,
        },
        include: {
          includedService: {
            select: { id: true, name: true }
          }
        },
      }),
      ...( (!tenant.clubEnabled || !tenant.clubPaymentProvider) ? [
        prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            clubEnabled: true,
            clubPaymentProvider: tenant.clubPaymentProvider || 'ASAAS',
          },
        })
      ] : []),
    ]);

    return NextResponse.json({
      id: newPlan.id,
      name: newPlan.name,
      description: newPlan.description,
      terms: newPlan.terms,
      priceInCents: newPlan.priceInCents,
      billingCycle: newPlan.billingCycle,
      discountPercent: newPlan.discountPercent,
      isActive: newPlan.isActive,
      includedServiceId: newPlan.includedServiceId,
      includedUsesPerPeriod: newPlan.includedUsesPerPeriod,
      includedBenefitType: newPlan.includedBenefitType,
      includedService: newPlan.includedService,
      createdAt: newPlan.createdAt,
      updatedAt: newPlan.updatedAt,
    }, { status: 201 });

  } catch (error) {
    console.error('[CLUB_PLANS_POST]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}