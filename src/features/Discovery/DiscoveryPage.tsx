'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/features/Navbar';
import { ProfileGrid } from './ProfileGrid';

type DiscoveryPageProps = {
  authError?: string;
  isLoggedIn: boolean;
  locale: string;
  userAvatarUrl?: string;
};

export const DiscoveryPage = ({
  authError,
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
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8">
        {authError ? (
          <div
            className="rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 font-figtree text-red-100 text-sm"
            role="alert"
          >
            <p className="font-semibold">{t('authErrorTitle')}</p>
            <p className="mt-1 text-red-100/80">{t('authErrorDescription')}</p>
          </div>
        ) : null}

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
