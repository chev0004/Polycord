import { NextResponse } from 'next/server';
import {
  updateSubscriptionByCustomerId,
  upsertSubscriptionForUser,
} from '@/db';
import {
  getStripeSubscription,
  getSubscriptionPeriodEnd,
  verifyStripeSignature,
} from '@/lib/stripe';

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

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

  const object = event?.data?.object;
  if (!object || typeof event.type !== 'string') {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  const checkout = event.type === 'checkout.session.completed';
  if (
    !checkout &&
    ![
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ].includes(event.type)
  ) {
    return NextResponse.json({ received: true });
  }

  const subscriptionId = checkout ? object.subscription : object.id;
  if (typeof subscriptionId !== 'string') {
    return NextResponse.json(
      { error: 'Missing subscription' },
      { status: 400 },
    );
  }

  try {
    const subscription = await getStripeSubscription(subscriptionId);
    const customerId = subscription.customer;
    const status = subscription.status;
    if (typeof customerId !== 'string' || typeof status !== 'string') {
      throw new Error('Invalid subscription');
    }
    const values = {
      stripeSubscriptionId: subscriptionId,
      status,
      currentPeriodEnd: ['canceled', 'incomplete_expired'].includes(status)
        ? null
        : getSubscriptionPeriodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    };
    if (checkout) {
      const userId = object.client_reference_id;
      if (typeof userId !== 'string' || object.customer !== customerId) {
        return NextResponse.json(
          { error: 'Invalid customer' },
          { status: 400 },
        );
      }
      await upsertSubscriptionForUser(userId, {
        stripeCustomerId: customerId,
        ...values,
      });
    } else {
      const updated = await updateSubscriptionByCustomerId(customerId, values);
      if (!updated) {
        return NextResponse.json(
          { error: 'Customer is not synchronized' },
          { status: 503 },
        );
      }
    }
  } catch {
    return NextResponse.json(
      { error: 'Subscription synchronization failed' },
      { status: 502 },
    );
  }

  return NextResponse.json({ received: true });
};
