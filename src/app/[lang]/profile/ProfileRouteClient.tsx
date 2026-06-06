'use client';

import { useRouter } from 'next/navigation';
import { Navbar } from '@/features/Navbar';
import { ProfilePage } from '@/features/Profile';
import type { ProfileFormValues } from '@/features/Profile/schema';

type ProfileRouteClientProps = {
  initialValues: ProfileFormValues;
  locale: string;
  userAvatarUrl?: string;
  userDisplayName: string;
};

export const ProfileRouteClient = ({
  initialValues,
  locale,
  userAvatarUrl,
  userDisplayName,
}: ProfileRouteClientProps) => {
  const router = useRouter();

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
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />
      <ProfilePage
        initialValues={initialValues}
        userAvatarUrl={userAvatarUrl}
        userDisplayName={userDisplayName}
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
      />
    </>
  );
};
