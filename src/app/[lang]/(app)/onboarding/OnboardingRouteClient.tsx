'use client';

import { discoveryCache } from '@/features/Discovery/discoveryCache';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { ProfilePage, saveVoiceIntroRequest } from '@/features/Profile';
import { saveResponseError } from '@/lib/formErrors';

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
      onSubmit={async (data, voiceClip) => {
        const response = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw await saveResponseError(response, 'Profile save failed');
        }

        if (voiceClip) await saveVoiceIntroRequest(voiceClip);
        if (data.isPublic) {
          try {
            sessionStorage.setItem(`polycord:bump-hint:${userId}`, '1');
          } catch {}
        }
        discoveryCache.expire();
        router.push(`/${locale}`);
        router.refresh();
      }}
    />
  );
};
