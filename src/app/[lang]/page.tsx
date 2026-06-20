import { Suspense } from 'react';
import {
  getProfileByUserId,
  listSavedProfileIds,
  upsertDiscordUser,
} from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { getCurrentUser } from '@/lib/auth';
import { hasPremiumEntitlement } from '@/lib/entitlements';
import { DiscoveryFeed } from './DiscoveryFeed';

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ authError?: string }>;
}) {
  const { lang } = await params;
  const { authError } = await searchParams;
  const user = await getCurrentUser();
  let needsOnboarding = false;
  let savedProfileIds: string[] = [];
  let currentProfileId: string | undefined;
  let bumpReadyAt: string | undefined;

  if (user) {
    const persistedUser = await upsertDiscordUser(user);
    const profile = await getProfileByUserId(persistedUser.id);
    needsOnboarding = !profile;
    currentProfileId = profile?.profile.id;
    savedProfileIds = await listSavedProfileIds(persistedUser.id);

    if (profile?.profile.isPublic) {
      const { nextBumpAt } = getBumpCooldown(
        profile.profile.lastBumpedAt,
        hasPremiumEntitlement(user),
      );
      bumpReadyAt = nextBumpAt.toISOString();
    }
  }

  const isLoggedIn = Boolean(user);

  return (
    <Suspense
      fallback={
        <DiscoveryPage
          authError={authError}
          isLoading
          isLoggedIn={isLoggedIn}
          locale={lang}
          needsOnboarding={needsOnboarding}
          currentProfileId={currentProfileId}
          bumpReadyAt={bumpReadyAt}
          userAvatarUrl={user?.avatarUrl}
        />
      }
    >
      <DiscoveryFeed
        authError={authError}
        isLoggedIn={isLoggedIn}
        locale={lang}
        needsOnboarding={needsOnboarding}
        savedProfileIds={savedProfileIds}
        currentProfileId={currentProfileId}
        bumpReadyAt={bumpReadyAt}
        userAvatarUrl={user?.avatarUrl}
      />
    </Suspense>
  );
}
