import { redirect } from 'next/navigation';
import {
  getProfileByUserId,
  listSavedProfiles,
  toViewerAvailabilityContext,
} from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { SavedRouteClient } from './SavedRouteClient';

export default async function SavedRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
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
      loadError={savedProfiles === null}
      viewerTimezone={viewer?.timezone}
      viewerAvailability={viewer?.availability}
    />
  );
}
