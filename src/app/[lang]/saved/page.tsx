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

  const profile = await getProfileByUserId(user.accountId);
  const viewer = profile
    ? toViewerAvailabilityContext(profile.profile)
    : undefined;
  let savedProfiles: Awaited<ReturnType<typeof listSavedProfiles>> = [];
  let loadError = false;

  try {
    savedProfiles = await listSavedProfiles(user.accountId);
  } catch (error) {
    console.error('Failed to load saved profiles:', error);
    loadError = true;
  }

  return (
    <SavedRouteClient
      locale={lang}
      profiles={savedProfiles}
      currentProfileId={profile?.profile.id}
      loadError={loadError}
      viewerTimezone={viewer?.timezone}
      viewerAvailability={viewer?.availability}
    />
  );
}
