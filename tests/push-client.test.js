import { afterAll, beforeEach, expect, test } from 'bun:test';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationState,
} from '../src/lib/push/client';

const originalFetch = globalThis.fetch;
const originals = Object.fromEntries(
  ['window', 'navigator', 'Notification'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);
const originalKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
let calls;
let activate;
let subscribed;
let unsubscribed;
let registration;

beforeEach(() => {
  calls = [];
  subscribed = false;
  unsubscribed = false;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
    Buffer.alloc(65).toString('base64url');
  registration = {
    pushManager: {
      getSubscription: async () => null,
      subscribe: async () => {
        subscribed = true;
        return {
          endpoint: 'https://fcm.googleapis.com/test',
          toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test' }),
          unsubscribe: async () => {
            unsubscribed = true;
          },
        };
      },
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { PushManager: {}, Notification: {} },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Notification', {
    value: { permission: 'granted', requestPermission: async () => 'granted' },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      serviceWorker: {
        register: async () => registration,
        getRegistration: async () => registration,
        ready: new Promise((resolve) => {
          activate = () => resolve(registration);
        }),
      },
    },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    calls.push([url, options?.method]);
    return Response.json({
      enabled: true,
      endpoints: ['https://fcm.googleapis.com/test'],
    });
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  if (originalKey === undefined)
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalKey;
});

test('first install waits for activation before subscribing', async () => {
  const result = enablePushNotifications();
  await Promise.resolve();
  await Promise.resolve();
  expect(subscribed).toBe(false);
  activate();
  expect(await result).toBe('enabled');
  expect(calls).toEqual([['/api/push/subscription', 'POST']]);
});

test('denied permission does not register a subscription', async () => {
  Notification.requestPermission = async () => 'denied';
  expect(await enablePushNotifications()).toBe('denied');
  expect(calls).toHaveLength(0);
});

test('failed disable preserves the browser subscription and reports failure', async () => {
  registration.pushManager.getSubscription = async () => ({
    unsubscribe: async () => {
      unsubscribed = true;
    },
  });
  globalThis.fetch = async () => new Response('', { status: 503 });
  await expect(disablePushNotifications()).rejects.toThrow();
  expect(unsubscribed).toBe(false);
});

test('initial state requires permission and a stored browser subscription', async () => {
  expect(await getPushNotificationState()).toBe('disabled');
  registration.pushManager.getSubscription = async () => ({
    endpoint: 'https://fcm.googleapis.com/test',
  });
  expect(await getPushNotificationState()).toBe('enabled');
  Notification.permission = 'denied';
  expect(await getPushNotificationState()).toBe('denied');
});
