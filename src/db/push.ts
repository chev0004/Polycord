import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from './client';
import {
  type PushSubscriptionRecord,
  pushSubscriptions,
  userSettings,
} from './schema';

export const savePushSubscription = async (
  userId: string,
  values: { endpoint: string; p256dh: string; auth: string },
) => {
  await db.transaction(async (tx) => {
    await tx
      .insert(pushSubscriptions)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId, p256dh: values.p256dh, auth: values.auth },
      });
    await tx
      .insert(userSettings)
      .values({ userId, pushNotifications: true })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { pushNotifications: true },
      });
  });
};

export const deletePushSubscriptionsForUser = async (userId: string) => {
  await db.transaction(async (tx) => {
    await tx
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    await tx
      .insert(userSettings)
      .values({ userId, pushNotifications: false })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { pushNotifications: false },
      });
  });
};

export const listPushSubscriptionsForUser = async (
  userId: string,
): Promise<PushSubscriptionRecord[]> =>
  db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
