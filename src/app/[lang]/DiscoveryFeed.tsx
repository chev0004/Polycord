import { listPublicProfiles } from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';

type DiscoveryFeedProps = {
  authError?: string;
  isLoggedIn: boolean;
  locale: string;
  needsOnboarding: boolean;
  savedProfileIds: string[];
  userAvatarUrl?: string;
};

export const DiscoveryFeed = async ({
  authError,
  isLoggedIn,
  locale,
  needsOnboarding,
  savedProfileIds,
  userAvatarUrl,
}: DiscoveryFeedProps) => {
  let profiles: DiscoveryProfile[] = [];
  let feedError = false;

  try {
    profiles = await listPublicProfiles();
  } catch (error) {
    console.error('Failed to load public profiles:', error);
    feedError = true;
  }

  return (
    <DiscoveryPage
      authError={authError}
      feedError={feedError}
      isLoggedIn={isLoggedIn}
      locale={locale}
      needsOnboarding={needsOnboarding}
      profiles={profiles}
      savedProfileIds={savedProfileIds}
      userAvatarUrl={userAvatarUrl}
    />
  );
};
