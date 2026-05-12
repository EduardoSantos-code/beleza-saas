import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; planId: string }> }
) {
  try {
    const { slug, planId } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const plan = await prisma.clubPlan.findFirst({
      where: { id: planId, tenantId: tenant.id },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      terms,
      priceInCents,
      billingCycle,
      discountPercent,
      isActive,
    } = body;

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 2) {
        return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 });
      }
      updateData.name = name;
    }

    if (priceInCents !== undefined) {
      if (!Number.isInteger(priceInCents) || priceInCents <= 0) {
        return NextResponse.json({ error: 'Preço deve ser um número inteiro maior que 0' }, { status: 400 });
      }
      updateData.priceInCents = priceInCents;
    }

    if (billingCycle !== undefined) {
      const validCycles = ['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY'];
      if (!validCycles.includes(billingCycle)) {
        return NextResponse.json({ error: 'Ciclo de faturamento inválido' }, { status: 400 });
      }
      updateData.billingCycle = billingCycle;
    }

    if (discountPercent !== undefined) {
      if (discountPercent !== null) {
        const discount = Number(discountPercent);
        if (isNaN(discount) || discount < 0 || discount > 100) {
          return NextResponse.json({ error: 'Desconto deve ser entre 0 e 100' }, { status: 400 });
        }
        updateData.discountPercent = discount;
      } else {
        updateData.discountPercent = null;
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (description !== undefined) updateData.description = description;
    if (terms !== undefined) updateData.terms = terms;

    const updatedPlan = await prisma.clubPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('[CLUB_PLAN_PATCH]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; planId: string }> }
) {
  try {
    const { slug, planId } = await params;
    await requireTenantAccess(slug);

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const plan = await prisma.clubPlan.findFirst({
      where: { id: planId, tenantId: tenant.id },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // Soft delete: apenas desativa o plano
    await prisma.clubPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[CLUB_PLAN_DELETE]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}