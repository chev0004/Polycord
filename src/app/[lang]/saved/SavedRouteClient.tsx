'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdBookmarkBorder, MdErrorOutline } from 'react-icons/md';
import { Button } from '@/components/Button';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ProfileGrid } from '@/features/Discovery/ProfileGrid';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';

type SavedRouteClientProps = {
  locale: string;
  profiles: DiscoveryProfile[];
  currentProfileId?: string;
  loadError?: boolean;
  userAvatarUrl?: string;
};

export const SavedRouteClient = ({
  locale,
  profiles: initialProfiles,
  currentProfileId,
  loadError = false,
  userAvatarUrl,
}: SavedRouteClientProps) => {
  const router = useRouteProgressRouter();
  const t = useTranslations('Saved');
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const profiles = initialProfiles.filter(
    (profile) => !removedIds.includes(profile.id),
  );

  const handleProfileUnsaved = (profileId: string) => {
    setRemovedIds((previous) => [...previous, profileId]);
  };

  return (
    <div className="min-h-screen bg-background-main text-foreground">
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

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        <header className="mb-[26px] flex flex-col gap-1.5">
          <span className="font-semibold text-primary text-xs uppercase tracking-wide">
            {t('eyebrow')}
          </span>
          <h1 className="font-figtree font-semibold text-2xl text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted text-sm">{t('subtitle')}</p>
        </header>

        {loadError ? (
          <div
            role="alert"
            className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-red-800 bg-danger-surface px-6 py-12 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-danger">
              <MdErrorOutline size={24} />
            </span>
            <h2 className="font-figtree font-semibold text-2xl text-foreground">
              {t('errorTitle')}
            </h2>
            <p className="max-w-[440px] text-muted text-sm">
              {t('errorDescription')}
            </p>
            <Button variant="primary" onClick={() => router.refresh()}>
              {t('errorRetry')}
            </Button>
          </div>
        ) : profiles.length > 0 ? (
          <ProfileGrid
            profiles={profiles}
            isLoggedIn
            savedProfileIds={profiles.map((profile) => profile.id)}
            currentProfileId={currentProfileId}
            onSaveProfile={saveProfileRequest}
            onProfileUnsaved={handleProfileUnsaved}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-primary-dark border-dashed bg-background-darker px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-darker text-primary">
              <MdBookmarkBorder size={24} />
            </span>
            <h2 className="font-figtree font-semibold text-2xl text-foreground">
              {t('emptyTitle')}
            </h2>
            <p className="max-w-[440px] text-muted text-sm">
              {t('emptyDescription')}
            </p>
            <Button variant="primary" onClick={() => router.push(`/${locale}`)}>
              {t('emptyAction')}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
