import { afterAll, beforeEach, expect, mock, test } from 'bun:test';
import { createHmac } from 'node:crypto';

mock.module('server-only', () => ({}));
const writes = [];
let subscription;
let deleted;
mock.module('@/db', () => ({
  getSubscriptionByUserId: async () => subscription,
  upsertSubscriptionForUser: async (...values) => writes.push(values),
  updateSubscriptionByCustomerId: async (...values) => {
    writes.push(values);
    return true;
  },
  deleteAccountByUserId: async () => {
    deleted = true;
    return true;
  },
}));
mock.module('@/lib/auth', () => ({
  getCurrentUser: async () => ({ id: 'discord-1', accountId: 'user-1' }),
  clearSessionCookie: () => {},
}));

const { POST: webhook } = await import('../src/app/api/billing/webhook/route');
const { POST: portal } = await import('../src/app/api/billing/portal/route');
const { DELETE: deleteAccount } = await import('../src/app/api/account/route');
const { getSubscriptionPeriodEnd } = await import('../src/lib/stripe');
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const stripeSubscription = {
  id: 'sub-1',
  customer: 'cus-1',
  status: 'active',
  items: {
    data: [{ price: { id: 'price-1' }, current_period_end: 2000000000 }],
  },
};

beforeEach(() => {
  writes.length = 0;
  deleted = false;
  subscription = {
    stripeCustomerId: 'cus-1',
    stripeSubscriptionId: 'sub-1',
    status: 'active',
  };
  process.env.STRIPE_SECRET_KEY = 'test-secret';
  process.env.STRIPE_PRICE_ID = 'price-1';
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook';
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
});

const checkoutRequest = () => {
  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: 'user-1',
        customer: 'cus-1',
        subscription: 'sub-1',
      },
    },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', 'test-webhook')
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
  });
};

test('failed subscription lookup grants nothing and webhook redelivery synchronizes', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  expect((await webhook(checkoutRequest())).status).toBe(502);
  expect(writes).toHaveLength(0);
  globalThis.fetch = async () => Response.json(stripeSubscription);
  expect((await webhook(checkoutRequest())).status).toBe(200);
  expect(writes[0][1].currentPeriodEnd.toISOString()).toBe(
    '2033-05-18T03:33:20.000Z',
  );
});

test('past-due subscribers repair billing through the portal', async () => {
  subscription.status = 'past_due';
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return Response.json({ url: 'https://billing.stripe.com/test' });
  };
  expect(
    (
      await portal(
        new Request('http://localhost/api/billing/portal', { method: 'POST' }),
      )
    ).status,
  ).toBe(200);
  expect(calls).toEqual(['https://api.stripe.com/v1/billing_portal/sessions']);
});

test('account deletion preserves billing mapping when cancellation fails', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  const response = await deleteAccount(
    new Request('http://localhost/api/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }),
  );
  expect(response.status).toBe(502);
  expect(deleted).toBe(false);
});

test('account deletion waits for confirmed subscription cancellation', async () => {
  globalThis.fetch = async (url, options) => {
    expect(deleted).toBe(false);
    expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub-1');
    expect(options.method).toBe('DELETE');
    return Response.json({ status: 'canceled' });
  };
  expect(
    (
      await deleteAccount(
        new Request('http://localhost/api/account', {
          method: 'DELETE',
          body: JSON.stringify({ confirmation: 'DELETE' }),
        }),
      )
    ).status,
  ).toBe(200);
  expect(deleted).toBe(true);
});

test('billing periods require the configured subscription item', () => {
  expect(getSubscriptionPeriodEnd(stripeSubscription).getTime()).toBe(
    2000000000000,
  );
  expect(() =>
    getSubscriptionPeriodEnd({ current_period_end: 2000000000 }),
  ).toThrow();
  expect(() =>
    getSubscriptionPeriodEnd({
      items: {
        data: [{ price: { id: 'other' }, current_period_end: 2000000000 }],
      },
    }),
  ).toThrow();
});
