'use client';

import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { ProfilePage } from '@/features/Profile';
import type { ProfileFormValues } from '@/features/Profile/schema';

type ProfileRouteClientProps = {
  initialValues?: ProfileFormValues;
  locale: string;
  profileId?: string;
  userAvatarUrl?: string;
  userDisplayName: string;
};

export const ProfileRouteClient = ({
  initialValues,
  locale,
  profileId,
  userAvatarUrl,
  userDisplayName,
}: ProfileRouteClientProps) => {
  const router = useRouteProgressRouter();

  return (
    <>
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSavedClick={() => router.push(`/${locale}/saved`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />
      <ProfilePage
        initialValues={initialValues}
        userAvatarUrl={userAvatarUrl}
        userDisplayName={userDisplayName}
        onViewPublicProfile={
          profileId ? () => router.push(`/${locale}/u/${profileId}`) : undefined
        }
        onSubmit={async (data) => {
          const response = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
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
    </>
  );
};
