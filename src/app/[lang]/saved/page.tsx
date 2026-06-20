import { redirect } from 'next/navigation';
import { getProfileByUserId, listSavedProfiles, upsertDiscordUser } from '@/db';
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
  const savedProfiles = await listSavedProfiles(persistedUser.id);

  return (
    <SavedRouteClient
      locale={lang}
      profiles={savedProfiles}
      currentProfileId={profile?.profile.id}
      userAvatarUrl={user.avatarUrl}
    />
  );
}
