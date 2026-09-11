import { redirect } from 'next/navigation';
import {
  getProfileByDiscordUserId,
  getSubscriptionByDiscordUserId,
  getUserByDiscordId,
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
    redirect(`/${lang}`);
  }

  const [account, profile, settings, subscription] = await Promise.all([
    getUserByDiscordId(user.id),
    getProfileByDiscordUserId(user.id),
    getUserSettingsByDiscordUserId(user.id),
    getSubscriptionByDiscordUserId(user.id),
  ]);

  const premium =
    hasPremiumEntitlement(user) || isSubscriptionActive(subscription);

  return (
    <main className="min-h-screen bg-background-main">
      <SettingsRouteClient
        defaultEmail={account?.email ?? user.email ?? ''}
        initialPrivacySettings={
          profile
            ? {
                allowAnonymousCopy: profile.profile.allowAnonymousCopy,
                displayTimezone: profile.profile.displayTimezone,
                isPublic: profile.profile.isPublic,
              }
            : undefined
        }
        initialSettings={
          settings
            ? {
                activityStatus: settings.activityStatus,
                applicationLanguage: settings.applicationLanguage,
                matchAlert: settings.matchAlert,
                profileInteractionAlert: settings.profileInteractionAlert,
                profileViewAlert: settings.profileViewAlert,
                hideProfileVisits: settings.hideProfileVisits,
                productAnalytics: settings.productAnalytics,
                pushNotifications: settings.pushNotifications,
                theme: settings.theme,
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
