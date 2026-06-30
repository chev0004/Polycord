import { redirect } from 'next/navigation';
import { getProfileByUserId, upsertDiscordUser } from '@/db';
import { OnboardingPage } from '@/features/Onboarding';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
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

  await trackEvent({
    name: ANALYTICS_EVENTS.onboardingStart,
    userId: user.id,
    locale: lang,
  });

  return (
    <OnboardingPage
      userAvatarUrl={currentUser.avatarUrl}
      userDisplayName={currentUser.name}
    />
  );
}
