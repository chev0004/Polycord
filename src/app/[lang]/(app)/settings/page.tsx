import { redirect } from 'next/navigation';
import {
  getPremiumAccountByDiscordUserId,
  getPremiumSource,
  getPrivacySettingsByDiscordUserId,
  getUserSettingsByDiscordUserId,
} from '@/db';
import { isOwner } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import { tracePage } from '@/lib/pageLoadTrace';
import { SettingsRouteClient } from './SettingsRouteClient';

async function SettingsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}?next=${encodeURIComponent(`/${lang}/settings`)}`);
  }

  const [privacySettings, settings, account, premium] = await Promise.all([
    getPrivacySettingsByDiscordUserId(user.id),
    getUserSettingsByDiscordUserId(user.id),
    getPremiumAccountByDiscordUserId(user.id),
    isPremiumUser(user),
  ]);
  const owner = isOwner(user);
  const subscription = account?.subscription;
  const premiumSource = account
    ? getPremiumSource(account.user, subscription ?? null)
    : 'free';

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
                loadTracing: owner ? settings.loadTracing : undefined,
                discoverySkeleton: owner
                  ? settings.discoverySkeleton
                  : undefined,
                pushNotifications: settings.pushNotifications,
                timeFormat: settings.timeFormat,
                languageDisplay: settings.languageDisplay,
              }
            : undefined
        }
        locale={lang}
        owner={owner}
        premium={premium}
        premiumSource={premiumSource}
        premiumGrantedUntil={
          premiumSource === 'granted' || premiumSource === 'both'
            ? account?.user.premiumGrantedUntil?.toISOString()
            : undefined
        }
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

export default tracePage('settings', SettingsRoute);
