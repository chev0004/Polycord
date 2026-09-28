import { redirect } from 'next/navigation';
import {
  getPrivacySettingsByDiscordUserId,
  getSubscriptionByDiscordUserId,
  getUserSettingsByDiscordUserId,
  isSubscriptionActive,
} from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPremiumEntitlement } from '@/lib/entitlements';
import { SettingsRouteClient } from './SettingsRouteClient';

export default async function SettingsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}?next=${encodeURIComponent(`/${lang}/settings`)}`);
  }

  const [privacySettings, settings, subscription] = await Promise.all([
    getPrivacySettingsByDiscordUserId(user.id),
    getUserSettingsByDiscordUserId(user.id),
    getSubscriptionByDiscordUserId(user.id),
  ]);

  const premium =
    hasPremiumEntitlement(user) || isSubscriptionActive(subscription);

  return (
    <main>
      <SettingsRouteClient
        userId={user.id}
        defaultEmail={user.email ?? ''}
        initialPrivacySettings={privacySettings}
        initialSettings={
          settings
            ? {
                profileInteractionAlert: settings.profileInteractionAlert,
                profileViewAlert: settings.profileViewAlert,
                hideProfileVisits: settings.hideProfileVisits,
                productAnalytics: settings.productAnalytics,
                pushNotifications: settings.pushNotifications,
                timeFormat: settings.timeFormat,
                languageDisplay: settings.languageDisplay,
              }
            : undefined
        }
        locale={lang}
        premium={premium}
        subscriptionRenewsAt={
          subscription?.currentPeriodEnd?.toISOString() ?? undefined
        }
        subscriptionCancelAtPeriodEnd={subscription?.cancelAtPeriodEnd}
        userAvatarUrl={user.avatarUrl}
        userDisplayName={user.name}
      />
    </main>
  );
}
