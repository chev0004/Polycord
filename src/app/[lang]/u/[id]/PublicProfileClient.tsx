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
import { ReportDialog } from '@/features/Discovery/ReportDialog';
import {
  blockProfileRequest,
  ReportProfileError,
  type ReportReason,
  reportProfileRequest,
} from '@/features/Discovery/safetyRequests';
import { saveProfileRequest } from '@/features/Discovery/saveProfileRequest';
import {
  buildPublicProfileUrl,
  shareProfileUrl,
} from '@/features/Discovery/shareProfile';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
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
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isOwnProfile = profile.id === currentProfileId;
  const canSave = isLoggedIn && !isOwnProfile;

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

  const handleReport = () => {
    if (!isLoggedIn) {
      addToast({
        title: t('reportLoginTitle'),
        description: t('reportLoginDescription'),
        duration: TOAST_DURATION,
      });
      return;
    }

    setIsReportOpen(true);
  };

  const handleSubmitReport = async (reason: ReportReason, details: string) => {
    try {
      await reportProfileRequest(profile.id, reason, details || undefined);
      addToast({
        title: t('reportSuccessTitle'),
        description: t('reportSuccessDescription'),
        duration: TOAST_DURATION,
      });
    } catch (error) {
      const limited =
        error instanceof ReportProfileError && error.status === 429;
      addToast({
        title: limited ? t('reportCooldownTitle') : t('reportErrorTitle'),
        description: limited
          ? t('reportCooldownDescription')
          : t('reportErrorDescription'),
        duration: TOAST_DURATION,
      });
      throw error;
    }
  };

  const handleBlock = async () => {
    if (!isLoggedIn) {
      addToast({
        title: t('blockLoginTitle'),
        description: t('blockLoginDescription'),
        duration: TOAST_DURATION,
      });
      return;
    }

    try {
      await blockProfileRequest(profile.id, true);
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      addToast({
        title: t('blockErrorTitle'),
        description: t('blockErrorDescription'),
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
    <div className="min-h-screen bg-background-main text-foreground">
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
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />

      <main className="mx-auto w-full max-w-lg px-4 py-8 sm:px-8">
        <button
          type="button"
          onClick={() => router.push(`/${locale}`)}
          className="mb-5 inline-flex items-center gap-1.5 text-muted text-sm transition-colors hover:text-foreground"
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
          onCopyUsername={
            isLoggedIn
              ? (_username, profileId) => {
                  notifyUsernameCopied(profileId).catch(() => {});
                }
              : undefined
          }
          onShare={handleShare}
          onReport={isOwnProfile ? undefined : handleReport}
          onBlock={isOwnProfile ? undefined : handleBlock}
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

      <ReportDialog
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        profileName={profile.displayName}
        onSubmit={handleSubmitReport}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
