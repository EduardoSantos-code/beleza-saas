import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function mapStripeStatus(status: string) {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAUSED";
    default:
      return "NONE";
  }
}

function timestampToDate(timestamp?: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000);
}

async function updateTenantFromSubscription(subscription: Stripe.Subscription) {
  const subscriptionAny = subscription as any;

  const tenantId =
    subscription.metadata?.tenantId ||
    subscriptionAny.metadata?.tenantId ||
    null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

  const data = {
    stripeCustomerId: customerId || undefined,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionStatus: mapStripeStatus(subscription.status) as any,
    subscriptionCurrentPeriodEnd: timestampToDate(
      subscriptionAny.current_period_end
    ),
    subscriptionCancelAtPeriodEnd: Boolean(
      subscriptionAny.cancel_at_period_end
    ),
  };

  if (tenantId) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    return;
  }

  if (customerId) {
    await prisma.tenant.updateMany({
      where: {
        stripeCustomerId: customerId,
      },
      data,
    });
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não definida" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe signature ausente" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error: any) {
    console.error("Erro ao validar webhook Stripe:", error?.message);

    return NextResponse.json(
      { error: `Webhook inválido: ${error?.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const tenantId = session.metadata?.tenantId || null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              stripeCustomerId: customerId || undefined,
              stripeSubscriptionId: subscriptionId || undefined,
            },
          });
        }

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await updateTenantFromSubscription(subscription);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateTenantFromSubscription(subscription);
        break;
      }

      default:
        console.log(`Evento Stripe ignorado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook Stripe:", error);

    return NextResponse.json(
      { error: "Erro interno ao processar webhook" },
      { status: 500 }
    );
  }
}