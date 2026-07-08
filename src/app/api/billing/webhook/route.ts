import { NextResponse } from 'next/server';
import {
  updateSubscriptionByCustomerId,
  upsertSubscriptionForUser,
} from '@/db';
import { getStripeSubscription, verifyStripeSignature } from '@/lib/stripe';

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

const toPeriodEnd = (value: unknown): Date | null =>
  typeof value === 'number' ? new Date(value * 1000) : null;

export const POST = async (request: Request) => {
  const payload = await request.text();

  if (
    !verifyStripeSignature(payload, request.headers.get('stripe-signature'))
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const object = event.data?.object ?? {};

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = object.client_reference_id;
      const customerId = object.customer;
      const subscriptionId = object.subscription;

      if (typeof userId !== 'string' || typeof customerId !== 'string') {
        break;
      }

      let status = 'active';
      let currentPeriodEnd: Date | null = null;

      if (typeof subscriptionId === 'string') {
        try {
          const subscription = await getStripeSubscription(subscriptionId);
          status = (subscription.status as string) ?? 'active';
          currentPeriodEnd = toPeriodEnd(subscription.current_period_end);
        } catch {}
      }

      await upsertSubscriptionForUser(userId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId:
          typeof subscriptionId === 'string' ? subscriptionId : null,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      });
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const customerId = object.customer;

      if (typeof customerId !== 'string') {
        break;
      }

      await updateSubscriptionByCustomerId(customerId, {
        stripeSubscriptionId:
          typeof object.id === 'string' ? object.id : undefined,
        status: (object.status as string) ?? 'active',
        currentPeriodEnd: toPeriodEnd(object.current_period_end),
        cancelAtPeriodEnd: object.cancel_at_period_end === true,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const customerId = object.customer;

      if (typeof customerId !== 'string') {
        break;
      }

      await updateSubscriptionByCustomerId(customerId, {
        status: 'canceled',
        currentPeriodEnd: toPeriodEnd(object.current_period_end),
        cancelAtPeriodEnd: false,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
};
