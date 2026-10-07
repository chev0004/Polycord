import { redirect } from 'next/navigation';
import { DEFAULT_DISCORD_CARD } from '@/constants/discordCards';
import {
  getBoostStatusForUser,
  getProfileByUserId,
  getProfileStatsForUser,
  mapProfileAvailability,
} from '@/db';
import {
  DEFAULT_CARD_COLOR,
  DEFAULT_CUSTOM_GRADIENT,
} from '@/features/Discovery/cardTheme';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import type { ProfileFormValues } from '@/features/Profile/schema';
import { getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import { ProfileRouteClient } from './ProfileRouteClient';

const toProfileFormValues = ({
  profile,
  targetLanguages,
}: NonNullable<
  Awaited<ReturnType<typeof getProfileByUserId>>
>): ProfileFormValues => ({
  allowAnonymousCopy: profile.allowAnonymousCopy,
  availability: mapProfileAvailability(profile) ?? null,
  bio: profile.bio,
  cardColor: profile.cardColor ?? DEFAULT_CARD_COLOR,
  customGradient:
    profile.customGradientFrom && profile.customGradientTo
      ? { from: profile.customGradientFrom, to: profile.customGradientTo }
      : DEFAULT_CUSTOM_GRADIENT,
  accentOverride: profile.accentOverride ?? null,
  discordCard: profile.discordCard ?? DEFAULT_DISCORD_CARD,
  country: profile.country ?? '',
  displayAvailability: profile.displayAvailability,
  displayTimezone: profile.displayTimezone,
  isPublic: profile.isPublic,
  primaryLanguage: profile.primaryLanguage,
  voiceIntroSeconds: profile.voiceIntroSeconds ?? 0,
  tags: profile.tags,
  targetLanguages,
  timezone: profile.timezone ?? '',
});

export default async function ProfileRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}?next=${encodeURIComponent(`/${lang}/profile`)}`);
  }

  const [profile, premium] = await Promise.all([
    getProfileByUserId(user.accountId),
    isPremiumUser(user),
  ]);
  const [boostStatus, stats] = await Promise.all([
    premium ? getBoostStatusForUser(user.accountId, premium) : undefined,
    premium && profile
      ? getProfileStatsForUser(user.accountId, profile.profile.id)
      : undefined,
  ]);

  return (
    <main>
      <ProfileRouteClient
        userId={user.id}
        locale={lang}
        premium={premium}
        boostedUntil={boostStatus?.boostedUntil?.toISOString()}
        boostsRemaining={boostStatus?.remaining}
        bumpReadyAt={
          profile?.profile.isPublic
            ? getBumpCooldown(
                profile.profile.lastBumpedAt,
                premium,
              ).nextBumpAt.toISOString()
            : undefined
        }
        lastBumpedAt={
          profile?.profile.isPublic
            ? profile.profile.lastBumpedAt?.toISOString()
            : undefined
        }
        stats={stats}
        initialValues={profile ? toProfileFormValues(profile) : undefined}
        profileId={profile?.profile.isPublic ? profile.profile.id : undefined}
        userAvatarUrl={user.avatarUrl}
        userDisplayName={user.name}
        userUsername={user.username}
      />
    </main>
  );
}
