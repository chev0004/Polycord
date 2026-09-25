'use client';

import { bumpProfileRequest } from '@/features/Discovery/bumpProfileRequest';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { ProfilePage } from '@/features/Profile';
import type { ProfileFormValues } from '@/features/Profile/schema';
import { SessionExpiredError } from '@/lib/formErrors';

type ProfileRouteClientProps = {
  userId: string;
  boostedUntil?: string;
  boostsRemaining?: number;
  bumpReadyAt?: string;
  initialValues?: ProfileFormValues;
  locale: string;
  premium?: boolean;
  profileId?: string;
  stats?: { views30d: number; copies30d: number; saves: number };
  userAvatarUrl?: string;
  userDisplayName: string;
};

export const ProfileRouteClient = ({
  userId,
  boostedUntil,
  boostsRemaining,
  bumpReadyAt,
  initialValues,
  locale,
  premium = false,
  profileId,
  stats,
  userAvatarUrl,
  userDisplayName,
}: ProfileRouteClientProps) => {
  const router = useRouteProgressRouter();

  return (
    <ProfilePage
      key={userId}
      userId={userId}
      boostedUntil={boostedUntil}
      boostsRemaining={boostsRemaining}
      bumpReadyAt={bumpReadyAt}
      initialValues={initialValues}
      onBoostProfile={
        premium && initialValues
          ? async () => {
              const response = await fetch('/api/profile/boost', {
                method: 'POST',
              });

              if (!response.ok) {
                throw new Error('Boost failed');
              }

              router.refresh();
            }
          : undefined
      }
      onBumpProfile={
        initialValues
          ? async () => {
              await bumpProfileRequest();
              router.refresh();
            }
          : undefined
      }
      onViewSaved={() => router.push(`/${locale}/saved`)}
      premium={premium}
      profileId={profileId}
      stats={stats}
      userAvatarUrl={userAvatarUrl}
      userDisplayName={userDisplayName}
      onViewPublicProfile={
        profileId
          ? () =>
              router.push(
                `/${locale}/u/${profileId}?from=${encodeURIComponent(`/${locale}/profile`)}`,
              )
          : undefined
      }
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

        router.refresh();
      }}
      onDeleteProfile={
        initialValues
          ? async () => {
              const response = await fetch('/api/profile', {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error('Profile delete failed');
              }

              router.push(`/${locale}/onboarding`);
              router.refresh();
            }
          : undefined
      }
    />
  );
};
