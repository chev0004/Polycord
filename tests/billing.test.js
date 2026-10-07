import { afterAll, beforeEach, expect, mock, test } from 'bun:test';
import { createHmac } from 'node:crypto';

mock.module('server-only', () => ({}));
mock.module('@/db/client', () => ({
  db: {},
  scopedRoute: (handler) => handler,
}));
const { getPremiumSource, isSubscriptionActive } = await import(
  '../src/db/billing'
);
const writes = [];
let subscription;
let premiumGrantedUntil;
let deleted;
mock.module('@/db', () => ({
  getSubscriptionByUserId: async () => subscription,
  getPremiumAccountByDiscordUserId: async () => ({
    user: { premiumGrantedUntil },
    subscription,
  }),
  getPremiumSource,
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
  premiumGrantedUntil = null;
  subscription = {
    stripeCustomerId: 'cus-1',
    stripeSubscriptionId: 'sub-1',
    status: 'active',
    currentPeriodEnd: new Date('2099-01-01'),
  };
  process.env.STRIPE_SECRET_KEY = 'test-secret';
  process.env.STRIPE_PRICE_ID = 'price-1';
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook';
});

test('membership sources distinguish active, expired and revoked grants', () => {
  const user = { premiumGrantedUntil: new Date('2099-01-01') };
  expect(getPremiumSource(user, null)).toBe('granted');
  expect(getPremiumSource(user, subscription)).toBe('both');
  user.premiumGrantedUntil = new Date('2000-01-01');
  expect(getPremiumSource(user, null)).toBe('free');
  expect(getPremiumSource(user, subscription)).toBe('purchased');
  user.premiumGrantedUntil = null;
  expect(getPremiumSource(user, null)).toBe('free');
});

test('granted-only billing requests create no Stripe session, even with an old customer', async () => {
  premiumGrantedUntil = new Date('2099-01-01');
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return Response.json({ url: 'https://stripe.com/test' });
  };
  for (const previous of [
    null,
    { ...subscription, status: 'canceled' },
    { ...subscription, status: 'incomplete_expired' },
    { ...subscription, status: 'none', stripeSubscriptionId: null },
  ]) {
    subscription = previous;
    expect(
      (
        await portal(
          new Request('http://localhost/api/billing/portal', {
            method: 'POST',
          }),
        )
      ).status,
    ).toBe(403);
  }
  expect(calls).toHaveLength(0);
});

test('expired and revoked grants can check out, and both sources can manage billing', async () => {
  const paid = subscription;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return Response.json({ url: 'https://stripe.com/test' });
  };
  subscription = null;
  for (const until of [new Date('2000-01-01'), null]) {
    premiumGrantedUntil = until;
    expect(
      (
        await portal(
          new Request('http://localhost/api/billing/portal', {
            method: 'POST',
          }),
        )
      ).status,
    ).toBe(200);
  }
  subscription = paid;
  premiumGrantedUntil = new Date('2099-01-01');
  expect(
    (
      await portal(
        new Request('http://localhost/api/billing/portal', { method: 'POST' }),
      )
    ).status,
  ).toBe(200);
  expect(calls).toEqual([
    'https://api.stripe.com/v1/checkout/sessions',
    'https://api.stripe.com/v1/checkout/sessions',
    'https://api.stripe.com/v1/billing_portal/sessions',
  ]);
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

test('non-cancelled subscriptions remain manageable alongside a grant without granting paid entitlements', async () => {
  premiumGrantedUntil = new Date('2099-01-01');
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return Response.json({ url: 'https://billing.stripe.com/test' });
  };
  for (const status of ['past_due', 'unpaid', 'incomplete', 'paused']) {
    subscription.status = status;
    expect(isSubscriptionActive(subscription)).toBe(false);
    expect(getPremiumSource({ premiumGrantedUntil }, subscription)).toBe(
      'both',
    );
    expect(getPremiumSource({ premiumGrantedUntil: null }, subscription)).toBe(
      'purchased',
    );
    for (const until of [premiumGrantedUntil, null]) {
      premiumGrantedUntil = until;
      expect(
        (
          await portal(
            new Request('http://localhost/api/billing/portal', {
              method: 'POST',
            }),
          )
        ).status,
      ).toBe(200);
    }
    premiumGrantedUntil = new Date('2099-01-01');
  }
  expect(calls).toEqual(
    Array(8).fill('https://api.stripe.com/v1/billing_portal/sessions'),
  );
});

test('checkout begun before a grant still records the purchased subscription', async () => {
  premiumGrantedUntil = new Date('2099-01-01');
  globalThis.fetch = async () => Response.json(stripeSubscription);
  expect((await webhook(checkoutRequest())).status).toBe(200);
  expect(writes[0][1].status).toBe('active');
  expect(premiumGrantedUntil.toISOString()).toBe('2099-01-01T00:00:00.000Z');
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
