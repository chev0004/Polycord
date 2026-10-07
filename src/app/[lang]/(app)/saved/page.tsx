import { redirect } from 'next/navigation';
import {
  getProfileByUserId,
  listSavedProfiles,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { getCurrentUser } from '@/lib/auth';
import { tracePage } from '@/lib/pageLoadTrace';
import { SavedRouteClient } from './SavedRouteClient';

async function SavedRoute({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${lang}?next=${encodeURIComponent(`/${lang}/saved`)}`);
  }

  const [profile, savedProfiles] = await Promise.all([
    getProfileByUserId(user.accountId),
    listSavedProfiles(user.accountId).catch((error) => {
      console.error('Failed to load saved profiles:', error);
      return null;
    }),
  ]);
  const viewer = profile
    ? toViewerAvailabilityContext(profile.profile)
    : undefined;

  return (
    <SavedRouteClient
      locale={lang}
      profiles={savedProfiles ?? []}
      currentProfileId={profile?.profile.id}
      bumpReadyAt={
        profile?.profile.isPublic
          ? getBumpCooldown(
              profile.profile.lastBumpedAt,
              Boolean(mapProfileToDiscoveryProfile(profile).premium),
            ).nextBumpAt.toISOString()
          : undefined
      }
      userAvatarUrl={user.avatarUrl}
      loadError={savedProfiles === null}
      viewerTimezone={viewer?.timezone}
      viewerAvailability={viewer?.availability}
    />
  );
}

export default tracePage('saved', SavedRoute);
