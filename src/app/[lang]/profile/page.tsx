import { redirect } from 'next/navigation';
import {
  getProfileByUserId,
  mapProfileAvailability,
  upsertDiscordUser,
} from '@/db';
import type { ProfileFormValues } from '@/features/Profile/schema';
import { getCurrentUser } from '@/lib/auth';
import { ProfileRouteClient } from './ProfileRouteClient';

const toProfileFormValues = ({
  profile,
  targetLanguages,
}: NonNullable<
  Awaited<ReturnType<typeof getProfileByUserId>>
>): ProfileFormValues => ({
  allowAnonymousCopy: profile.allowAnonymousCopy,
  availability: mapProfileAvailability(profile) ?? null,
  bio: profile.bio,
  country: profile.country ?? '',
  displayAvailability: profile.displayAvailability,
  displayTimezone: profile.displayTimezone,
  isPublic: profile.isPublic,
  primaryLanguage: profile.primaryLanguage,
  tags: profile.tags,
  targetLanguages,
  timezone: profile.timezone ?? '',
});

export default async function ProfileRoute({
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

  return (
    <main className="min-h-screen bg-background-main">
      <ProfileRouteClient
        locale={lang}
        initialValues={profile ? toProfileFormValues(profile) : undefined}
        profileId={profile?.profile.isPublic ? profile.profile.id : undefined}
        userAvatarUrl={user.avatarUrl}
        userDisplayName={user.name}
      />
    </main>
  );
}
