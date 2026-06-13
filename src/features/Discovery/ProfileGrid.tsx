'use client';

import { useTranslations } from 'next-intl';
import React, { type ReactNode, useMemo } from 'react';
import { Toast, ToastProvider, ToastViewport } from '@/components/Toast';
import {
  calculateMatchScore,
  type MatchCriteria,
  useProfileMatching,
} from '@/hooks/useProfileMatching';
import { type ToastData, useToast, useToastStack } from '@/hooks/useToast';
import { getFreeCardTheme } from './cardTheme';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';

type ProfileGridProps = {
  profiles: DiscoveryProfile[];
  emptyState?: ReactNode;
  isLoggedIn?: boolean;
  matchCriteria?: MatchCriteria | null;
  sortByMatchScore?: boolean;
  onCopyUsername?: (username: string, profileId: string) => void;
  onTagClick?: (tag: string, profileId: string) => void;
  onLanguageClick?: (
    language: string,
    level: string | undefined,
    isPrimary: boolean,
    profileId: string,
  ) => void;
  onCountryClick?: (country: string, profileId: string) => void;
  onViewProfile?: (profileId: string) => void;
  onReport?: (profileId: string) => void;
  onBlock?: (profileId: string) => void;
  onShare?: (profileId: string) => void;
};

const ToastComponent = React.memo(
  ({
    toast,
    onDismiss,
  }: {
    toast: ToastData;
    onDismiss: (id: number) => void;
  }) => {
    const { open, onOpenChange, timerRef } = useToast({ toast, onDismiss });

    if (!open && !timerRef.current) return null;

    return (
      <Toast
        open={open}
        onOpenChange={onOpenChange}
        title={toast.title}
        description={toast.description}
        duration={toast.duration}
        timerRef={timerRef}
        iconUrl={toast.iconUrl}
      />
    );
  },
);
ToastComponent.displayName = 'ToastComponent';

export const ProfileGrid = ({
  profiles,
  emptyState,
  isLoggedIn = false,
  matchCriteria = null,
  sortByMatchScore = false,
  onCopyUsername,
  onTagClick,
  onLanguageClick,
  onCountryClick,
  onViewProfile,
  onReport,
  onBlock,
  onShare,
}: ProfileGridProps) => {
  const t = useTranslations('Discovery');
  const { toasts, addToast, dismissToast } = useToastStack();

  const filteredProfiles = useProfileMatching(profiles, matchCriteria);

  const displayedProfiles = useMemo(() => {
    if (!matchCriteria || !sortByMatchScore) {
      return filteredProfiles;
    }

    return [...filteredProfiles].sort((a, b) => {
      const scoreA = calculateMatchScore(a, matchCriteria);
      const scoreB = calculateMatchScore(b, matchCriteria);
      return scoreB - scoreA;
    });
  }, [filteredProfiles, matchCriteria, sortByMatchScore]);

  const hasProfiles = displayedProfiles.length > 0;

  const handleCopyUsername = (
    username: string,
    profileId: string,
    avatarUrl?: string,
  ) => {
    addToast({
      title: t('copied'),
      description: t('copiedToClipboard', { username }),
      iconUrl: avatarUrl,
      duration: 4000,
    });

    if (onCopyUsername) {
      onCopyUsername(username, profileId);
    }
  };

  return (
    <ToastProvider>
      <section className="flex flex-col gap-6">
        {hasProfiles ? (
          <div className="mx-auto w-full max-w-[1180px] columns-1 gap-6 md:columns-2 lg:columns-3">
            {displayedProfiles.map((profile, index) => (
              <ProfileCard
                key={profile.id}
                profile={{
                  ...profile,
                  cardTheme: profile.cardTheme ?? getFreeCardTheme(index),
                }}
                isLoggedIn={isLoggedIn}
                onCopyUsername={handleCopyUsername}
                onTagClick={onTagClick}
                onLanguageClick={onLanguageClick}
                onCountryClick={onCountryClick}
                onViewProfile={onViewProfile}
                onReport={onReport}
                onBlock={onBlock}
                onShare={onShare}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-primary/30 border-dashed bg-background-darker/60 px-6 py-12 text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary text-xs uppercase tracking-wide">
              {t('emptyStateBadge')}
            </span>
            <h3 className="font-figtree font-semibold text-2xl text-white">
              {t('emptyStateTitle')}
            </h3>
            <p className="max-w-[440px] text-gray-400 text-sm">
              {emptyState ?? t('emptyStateDescription')}
            </p>
          </div>
        )}
      </section>

      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};
