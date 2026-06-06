import { redirect } from 'next/navigation';
import { getProfileByUserId, upsertDiscordUser } from '@/db';
import { OnboardingPage } from '@/features/Onboarding';
import { getCurrentUser } from '@/lib/auth';

export default async function OnboardingRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/${lang}`);
  }

  const user = await upsertDiscordUser(currentUser);
  const existingProfile = await getProfileByUserId(user.id);

  if (existingProfile) {
    redirect(`/${lang}`);
  }

  return (
    <OnboardingPage
      userAvatarUrl={currentUser.avatarUrl}
      userDisplayName={currentUser.name}
    />
  );
}
