'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import { ToastStack } from '@/components/Toast';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import {
  type DiscoveryProfile,
  ProfileCard,
} from '@/features/Discovery/ProfileCard';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import {
  buildPublicProfileUrl,
  shareProfileUrl,
} from '@/features/Discovery/shareProfile';
import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { useToastStack } from '@/hooks/useToast';

type PublicProfileClientProps = {
  locale: string;
  profile: DiscoveryProfile;
  isLoggedIn: boolean;
  isSaved: boolean;
  currentProfileId?: string;
  viewerTimezone?: string;
  userAvatarUrl?: string;
};

const TOAST_DURATION = 4000;

export const PublicProfileClient = ({
  locale,
  profile,
  isLoggedIn,
  isSaved: initialSaved,
  currentProfileId,
  viewerTimezone,
  userAvatarUrl,
}: PublicProfileClientProps) => {
  const router = useRouteProgressRouter();
  const t = useTranslations('Discovery');
  const tPublic = useTranslations('PublicProfile');
  const { toasts, addToast, dismissToast } = useToastStack();
  const [isSaved, setIsSaved] = useState(initialSaved);

  const canSave = isLoggedIn && profile.id !== currentProfileId;

  const handleToggleSave = async () => {
    if (!isLoggedIn) {
      addToast({
        title: t('saveLoginTitle'),
        description: t('saveLoginDescription'),
        duration: TOAST_DURATION,
      });
      return;
    }

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await saveProfileRequest(profile.id, nextSaved);
    } catch {
      setIsSaved(!nextSaved);
      addToast({
        title: t('saveError'),
        description: t('saveErrorDescription'),
        duration: TOAST_DURATION,
      });
    }
  };

  const handleShare = async () => {
    const result = await shareProfileUrl(
      buildPublicProfileUrl(locale, profile.id),
    );

    if (result === 'copied') {
      addToast({
        title: t('shareCopiedTitle'),
        description: t('shareCopiedDescription'),
        duration: TOAST_DURATION,
      });
    } else if (result === 'error') {
      addToast({
        title: t('shareErrorTitle'),
        description: t('shareErrorDescription'),
        duration: TOAST_DURATION,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background-main text-white">
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn={isLoggedIn}
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSavedClick={() => router.push(`/${locale}/saved`)}
        onActivityClick={() => router.push(`/${locale}/activity`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />

      <main className="mx-auto w-full max-w-lg px-4 py-8 sm:px-8">
        <button
          type="button"
          onClick={() => router.push(`/${locale}`)}
          className="mb-5 inline-flex items-center gap-1.5 text-gray-400 text-sm transition-colors hover:text-white"
        >
          <MdArrowBack size={18} />
          {tPublic('backToDiscovery')}
        </button>

        <ProfileCard
          profile={profile}
          isLoggedIn={isLoggedIn}
          isSaved={isSaved}
          viewerTimezone={viewerTimezone}
          onToggleSave={canSave ? handleToggleSave : undefined}
          onShare={handleShare}
          onTagClick={(tag) =>
            router.push(buildDiscoveryFilterHref(locale, 'tag', tag))
          }
          onLanguageClick={(language, _level, isPrimary) =>
            router.push(
              buildDiscoveryFilterHref(
                locale,
                isPrimary ? 'primaryLanguage' : 'targetLanguage',
                language,
              ),
            )
          }
          onCountryClick={(country) =>
            router.push(buildDiscoveryFilterHref(locale, 'country', country))
          }
        />
      </main>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
