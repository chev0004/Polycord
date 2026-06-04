'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/features/Navbar';
import { ProfileGrid } from './ProfileGrid';

type DiscoveryPageProps = {
  isLoggedIn: boolean;
  locale: string;
  userAvatarUrl?: string;
};

export const DiscoveryPage = ({
  isLoggedIn,
  locale,
  userAvatarUrl,
}: DiscoveryPageProps) => {
  const router = useRouter();
  const t = useTranslations('Discovery');

  return (
    <div className="min-h-screen bg-background-main text-white">
      <Navbar
        iconUrl={isLoggedIn ? userAvatarUrl : undefined}
        notifications={[]}
        onLoginClick={() => console.log('Login is not wired up yet')}
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() => console.log('Logout is not wired up yet')}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8">
        <header className="flex max-w-3xl flex-col gap-3">
          <p className="font-semibold text-primary text-xs uppercase tracking-wide">
            {t('pageEyebrow')}
          </p>
          <h1 className="font-bold font-figtree text-3xl text-white sm:text-4xl">
            {t('pageTitle')}
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed sm:text-base">
            {t('pageDescription')}
          </p>
        </header>

        <ProfileGrid
          profiles={[]}
          isLoggedIn={isLoggedIn}
          emptyState={t('emptyLoggedOutDescription')}
        />
      </main>
    </div>
  );
};
