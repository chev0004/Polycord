'use client';

import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { ProfilePage } from '@/features/Profile';
import { SessionExpiredError } from '@/lib/formErrors';

type OnboardingRouteClientProps = {
  userId: string;
  locale: string;
  premium?: boolean;
  userAvatarUrl?: string;
  userDisplayName: string;
  userUsername?: string;
};

export const OnboardingRouteClient = ({
  userId,
  locale,
  premium = false,
  userAvatarUrl,
  userDisplayName,
  userUsername,
}: OnboardingRouteClientProps) => {
  const router = useRouteProgressRouter();

  return (
    <ProfilePage
      key={userId}
      mode="create"
      userId={userId}
      premium={premium}
      userAvatarUrl={userAvatarUrl}
      userDisplayName={userDisplayName}
      userUsername={userUsername}
      onSubmit={async (data) => {
        const response = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          if (response.status === 401) throw new SessionExpiredError();
          throw new Error('Profile save failed');
        }

        router.push(`/${locale}`);
        router.refresh();
      }}
    />
  );
};
