import 'server-only';

import { eq } from 'drizzle-orm';
import webpush from 'web-push';
import { getSubscriptionByUserId, isSubscriptionActive } from '@/db/billing';
import { db } from '@/db/client';
import { listPushSubscriptionsForUser } from '@/db/push';
import { type NotificationRecord, pushSubscriptions, users } from '@/db/schema';
import { getUserSettingsByUserId } from '@/db/settings';
import { isPremiumDiscordId } from '@/lib/entitlements';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';

export const isPushEndpoint = (endpoint: string) => {
  if (!URL.canParse(endpoint)) return false;
  const url = new URL(endpoint);
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === '443') &&
    (url.hostname === 'fcm.googleapis.com' ||
      url.hostname === 'web.push.apple.com' ||
      url.hostname.endsWith('.push.services.mozilla.com') ||
      url.hostname.endsWith('.notify.windows.com'))
  );
};

export const isPushConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );

export const sendPushForNotification = async (
  notification: NotificationRecord,
) => {
  if (!isPushConfigured()) return;
  const settings = await getUserSettingsByUserId(notification.userId);
  if (!settings?.pushNotifications) return;
  if (notification.kind === 'copy' && !settings.profileInteractionAlert) return;
  if (notification.kind === 'view') {
    if (!settings.profileViewAlert) return;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, notification.userId));
    if (
      !isPremiumDiscordId(user.discordUserId) &&
      !isSubscriptionActive(await getSubscriptionByUserId(user.id))
    )
      return;
  }
  const subscriptions = await listPushSubscriptionsForUser(notification.userId);
  const locale = settings.applicationLanguage === 'ja' ? 'ja' : 'en';
  const body = (locale === 'ja' ? ja : en).Settings.pushNotificationBody;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      if (!isPushEndpoint(subscription.endpoint)) return;
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({ title: 'Polycord', body, url: `/${locale}` }),
          {
            vapidDetails: {
              subject: process.env.VAPID_SUBJECT as string,
              publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
              privateKey: process.env.VAPID_PRIVATE_KEY as string,
            },
            timeout: 5000,
            TTL: 3600,
          },
        );
      } catch (error) {
        if (
          error instanceof webpush.WebPushError &&
          [404, 410].includes(error.statusCode)
        ) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, subscription.id));
        }
      }
    }),
  );
};
