'use client';

import { ProfilePage } from '@/features/Profile';

export default function ProfileRoute() {
  return (
    <main className="min-h-screen bg-background-main">
      <ProfilePage onSubmit={(data) => console.log('Profile route', data)} />
    </main>
  );
}
