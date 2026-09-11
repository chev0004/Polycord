import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2025-03-31.basil';

export const isBillingConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

const stripeRequest = async (
  path: string,
  params: Record<string, string>,
  method = 'POST',
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_API_VERSION,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error = data.error as { message?: string } | undefined;
    throw new Error(error?.message ?? `Stripe request failed: ${path}`);
  }

  return data;
};

export const createCheckoutSession = async (options: {
  userId: string;
  customerId?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> => {
  const params: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][price]': process.env.STRIPE_PRICE_ID as string,
    'line_items[0][quantity]': '1',
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    client_reference_id: options.userId,
  };

  if (options.customerId) {
    params.customer = options.customerId;
  } else if (options.email) {
    params.customer_email = options.email;
  }

  const session = await stripeRequest('/checkout/sessions', params);

  return session.url as string;
};

export const createPortalSession = async (options: {
  customerId: string;
  returnUrl: string;
}): Promise<string> => {
  const session = await stripeRequest('/billing_portal/sessions', {
    customer: options.customerId,
    return_url: options.returnUrl,
  });

  return session.url as string;
};

export const getStripeSubscription = async (
  subscriptionId: string,
): Promise<Record<string, unknown>> => {
  const response = await fetch(
    `${STRIPE_API_BASE}/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Stripe-Version': STRIPE_API_VERSION,
      },
    },
  );

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Stripe subscription lookup failed: ${subscriptionId}`);
  }

  return data;
};

export const cancelStripeSubscription = async (subscriptionId: string) => {
  const subscription = await stripeRequest(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {},
    'DELETE',
  );
  if (subscription.status !== 'canceled') {
    throw new Error('Stripe subscription cancellation was not confirmed');
  }
};

export const getSubscriptionPeriodEnd = (
  subscription: Record<string, unknown>,
): Date => {
  const items = subscription.items as
    | {
        data?: { price?: { id?: string }; current_period_end?: number }[];
      }
    | undefined;
  const item = items?.data?.find(
    (entry) => entry.price?.id === process.env.STRIPE_PRICE_ID,
  );
  const value = item?.current_period_end;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Stripe subscription billing period is missing');
  }
  return new Date(value * 1000);
};

const SIGNATURE_TOLERANCE_SECONDS = 300;

export const verifyStripeSignature = (
  payload: string,
  signatureHeader: string | null,
): boolean => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const parts = new Map(
    signatureHeader.split(',').map((part) => {
      const [key, ...rest] = part.split('=');
      return [key.trim(), rest.join('=')] as const;
    }),
  );

  const timestamp = parts.get('t');
  const signature = parts.get('v1');

  if (!timestamp || !signature) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));

  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
};
