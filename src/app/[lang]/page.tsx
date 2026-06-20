import { Suspense } from 'react';
import {
  getProfileByUserId,
  listSavedProfileIds,
  upsertDiscordUser,
} from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import { getCurrentUser } from '@/lib/auth';
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

  if (user) {
    const persistedUser = await upsertDiscordUser(user);
    const profile = await getProfileByUserId(persistedUser.id);
    needsOnboarding = !profile;
    currentProfileId = profile?.profile.id;
    savedProfileIds = await listSavedProfileIds(persistedUser.id);
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
        userAvatarUrl={user?.avatarUrl}
      />
    </Suspense>
  );
}
