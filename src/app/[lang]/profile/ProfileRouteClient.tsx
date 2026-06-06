'use client';

import { ProfilePage } from '@/features/Profile';

type ProfileRouteClientProps = {
  userAvatarUrl?: string;
  userDisplayName: string;
};

export const ProfileRouteClient = ({
  userAvatarUrl,
  userDisplayName,
}: ProfileRouteClientProps) => (
  <ProfilePage
    userAvatarUrl={userAvatarUrl}
    userDisplayName={userDisplayName}
    onSubmit={(data) => console.log('Profile route', data)}
  />
);
