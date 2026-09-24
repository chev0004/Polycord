import { redirect } from 'next/navigation';
import {
  getProfileByUserId,
  listSavedProfiles,
  toViewerAvailabilityContext,
  upsertDiscordUser,
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
    redirect(`/${lang}`);
  }

  const persistedUser = await upsertDiscordUser(user);
  const profile = await getProfileByUserId(persistedUser.id);
  let savedProfiles: Awaited<ReturnType<typeof listSavedProfiles>> = [];
  let loadError = false;

  try {
    savedProfiles = await listSavedProfiles(persistedUser.id);
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
      userAvatarUrl={user.avatarUrl}
      viewerTimezone={
        profile
          ? toViewerAvailabilityContext(profile.profile).timezone
          : undefined
      }
    />
  );
}
