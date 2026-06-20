import { redirect } from 'next/navigation';
import { availabilityPresetToPattern } from '@/constants/availability';
import { isValidAvailability } from '@/constants/languages';
import { getProfileByUserId, upsertDiscordUser } from '@/db';
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
  availability: availabilityPresetToPattern(
    isValidAvailability(profile.availability)
      ? profile.availability
      : 'flexible',
  ),
  bio: profile.bio,
  country: profile.country ?? '',
  displayTimezone: profile.displayTimezone,
  isPublic: profile.isPublic,
  lookingFor: profile.lookingFor,
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
        userAvatarUrl={user.avatarUrl}
        userDisplayName={user.name}
      />
    </main>
  );
}
