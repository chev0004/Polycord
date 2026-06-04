'use client';

import { ProfilePage } from '@/features/Profile';

export const ProfileRouteClient = () => (
  <ProfilePage onSubmit={(data) => console.log('Profile route', data)} />
);
