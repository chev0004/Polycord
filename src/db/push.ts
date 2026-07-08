import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from './client';
import { type PushSubscriptionRecord, pushSubscriptions } from './schema';

export const savePushSubscription = async (
  userId: string,
  values: { endpoint: string; p256dh: string; auth: string },
) => {
  await db
    .insert(pushSubscriptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: values.p256dh, auth: values.auth },
    });
};

export const deletePushSubscriptionsForUser = async (userId: string) => {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
};

export const listPushSubscriptionsForUser = async (
  userId: string,
): Promise<PushSubscriptionRecord[]> =>
  db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
