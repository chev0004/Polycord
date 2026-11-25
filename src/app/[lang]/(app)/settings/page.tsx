import { redirect } from 'next/navigation';
import {
  getPremiumAccountByDiscordUserId,
  getPrivacySettingsByDiscordUserId,
  getUserSettingsByDiscordUserId,
  hasActivePremiumGrant,
} from '@/db';
import { isOwner } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import { tracePage } from '@/lib/pageLoadTrace';
import { pageTitle } from '@/lib/pageTitle';
import { SettingsRouteClient } from './SettingsRouteClient';

export const generateMetadata = pageTitle('settings');

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

  return (
    <main>
      <SettingsRouteClient
        userId={user.id}
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
        premiumGrantedUntil={
          account && hasActivePremiumGrant(account)
            ? account.premiumGrantedUntil?.toISOString()
            : undefined
        }
        userAvatarUrl={user.avatarUrl}
        userDisplayName={user.name}
      />
    </main>
  );
}

export default tracePage('settings', SettingsRoute);
