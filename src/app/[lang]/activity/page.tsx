import { redirect } from 'next/navigation';
import {
  getUserAnalyticsEventCounts,
  getUserSettingsByUserId,
  upsertDiscordUser,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { getCurrentUser } from '@/lib/auth';
import { hasPremiumEntitlement } from '@/lib/entitlements';
import { ActivityRouteClient } from './ActivityRouteClient';

const RANGE_DAYS = 30;

export default async function ActivityRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}`);
  }

  const persistedUser = await upsertDiscordUser(user);
  const settings = await getUserSettingsByUserId(persistedUser.id);
  const analyticsEnabled = settings?.productAnalytics ?? true;

  const counts = analyticsEnabled
    ? await getUserAnalyticsEventCounts(persistedUser.id, RANGE_DAYS)
    : [];
  const countByName = new Map(counts.map((row) => [row.name, row.total]));
  const total = (name: string) => countByName.get(name) ?? 0;

  return (
    <main className="min-h-screen bg-background-main">
      <ActivityRouteClient
        locale={lang}
        rangeDays={RANGE_DAYS}
        analyticsEnabled={analyticsEnabled}
        premium={hasPremiumEntitlement(user)}
        stats={{
          profilesViewed:
            total(ANALYTICS_EVENTS.discoveryView) +
            total(ANALYTICS_EVENTS.profileView),
          usernamesCopied: total(ANALYTICS_EVENTS.profileUsernameCopy),
          profilesSaved: total(ANALYTICS_EVENTS.profileSaveFavorite),
          profileBumps: total(ANALYTICS_EVENTS.profileBump),
        }}
      />
    </main>
  );
}
