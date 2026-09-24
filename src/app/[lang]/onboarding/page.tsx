import { redirect } from 'next/navigation';
import { getProfileByUserId } from '@/db';
import { OnboardingPage } from '@/features/Onboarding';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';

export default async function OnboardingRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/${lang}?next=${encodeURIComponent(`/${lang}/onboarding`)}`);
  }

  const existingProfile = await getProfileByUserId(currentUser.accountId);

  if (existingProfile) {
    redirect(`/${lang}`);
  }

  await trackEvent({
    name: ANALYTICS_EVENTS.onboardingStart,
    userId: currentUser.accountId,
    locale: lang,
  });

  return (
    <OnboardingPage
      key={currentUser.id}
      userId={currentUser.id}
      premium={await isPremiumUser(currentUser)}
      userAvatarUrl={currentUser.avatarUrl}
      userDisplayName={currentUser.name}
    />
  );
}
