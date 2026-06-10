import { Suspense } from 'react';
import { getProfileByUserId, upsertDiscordUser } from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import { ProfileGridSkeleton } from '@/features/Discovery/ProfileGridSkeleton';
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

  if (user) {
    const persistedUser = await upsertDiscordUser(user);
    const profile = await getProfileByUserId(persistedUser.id);
    needsOnboarding = !profile;
  }

  return (
    <DiscoveryPage
      authError={authError}
      isLoggedIn={Boolean(user)}
      locale={lang}
      needsOnboarding={needsOnboarding}
      userAvatarUrl={user?.avatarUrl}
      feed={
        <Suspense fallback={<ProfileGridSkeleton />}>
          <DiscoveryFeed isLoggedIn={Boolean(user)} locale={lang} />
        </Suspense>
      }
    />
  );
}
