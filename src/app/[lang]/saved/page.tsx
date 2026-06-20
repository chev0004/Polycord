import { redirect } from 'next/navigation';
import { listSavedProfiles, upsertDiscordUser } from '@/db';
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
  const savedProfiles = await listSavedProfiles(persistedUser.id);

  return (
    <SavedRouteClient
      locale={lang}
      profiles={savedProfiles}
      userAvatarUrl={user.avatarUrl}
    />
  );
}
