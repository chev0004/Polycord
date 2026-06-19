import { Suspense } from 'react';
import {
  getProfileByUserId,
  mapProfileToViewerMatch,
  upsertDiscordUser,
} from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import type { ViewerMatchProfile } from '@/features/Discovery/discoveryMatch';
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
  let viewer: ViewerMatchProfile | null = null;

  if (user) {
    const persistedUser = await upsertDiscordUser(user);
    const profile = await getProfileByUserId(persistedUser.id);
    needsOnboarding = !profile;
    viewer = profile ? mapProfileToViewerMatch(profile) : null;
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
          userAvatarUrl={user?.avatarUrl}
          viewer={viewer}
        />
      }
    >
      <DiscoveryFeed
        authError={authError}
        isLoggedIn={isLoggedIn}
        locale={lang}
        needsOnboarding={needsOnboarding}
        userAvatarUrl={user?.avatarUrl}
        viewer={viewer}
      />
    </Suspense>
  );
}
