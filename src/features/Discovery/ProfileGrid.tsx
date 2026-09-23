'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ToastStack } from '@/components/Toast';
import {
  calculateMatchScore,
  type MatchCriteria,
  useProfileMatching,
} from '@/hooks/useProfileMatching';
import { type ToastData, useToastStack } from '@/hooks/useToast';
import { getFreeCardTheme } from './cardTheme';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';

type ProfileGridProps = {
  profiles: DiscoveryProfile[];
  emptyState?: ReactNode;
  isLoggedIn?: boolean;
  savedProfileIds?: string[];
  currentProfileId?: string;
  viewerTimezone?: string;
  matchCriteria?: MatchCriteria | null;
  sortByMatchScore?: boolean;
  onCopyUsername?: (username: string, profileId: string) => void;
  onSaveProfile?: (profileId: string, nextSaved: boolean) => Promise<void>;
  onProfileUnsaved?: (profileId: string) => void;
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
  addToast?: (toast: Omit<ToastData, 'id'>) => void;
};

type ProfileGridItem = {
  profile: DiscoveryProfile;
  index: number;
};

export const ProfileGrid = ({
  profiles,
  emptyState,
  isLoggedIn = false,
  savedProfileIds,
  currentProfileId,
  viewerTimezone,
  matchCriteria = null,
  sortByMatchScore = false,
  onCopyUsername,
  onSaveProfile,
  onProfileUnsaved,
  onTagClick,
  onLanguageClick,
  onCountryClick,
  onViewProfile,
  onReport,
  onBlock,
  onShare,
  addToast: externalAddToast,
}: ProfileGridProps) => {
  const t = useTranslations('Discovery');
  const localStack = useToastStack();
  const addToast = externalAddToast ?? localStack.addToast;
  const ownsToastStack = !externalAddToast;
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(savedProfileIds),
  );

  const saveEnabled = Boolean(onSaveProfile);

  const handleToggleSave = useCallback(
    async (profileId: string) => {
      if (!onSaveProfile) {
        return;
      }

      if (!isLoggedIn) {
        addToast({
          title: t('saveLoginTitle'),
          description: t('saveLoginDescription'),
          duration: 4000,
        });
        return;
      }

      const nextSaved = !savedIds.has(profileId);

      setSavedIds((previous) => {
        const next = new Set(previous);
        if (nextSaved) {
          next.add(profileId);
        } else {
          next.delete(profileId);
        }
        return next;
      });

      try {
        await onSaveProfile(profileId, nextSaved);
        if (!nextSaved) {
          onProfileUnsaved?.(profileId);
        }
      } catch {
        setSavedIds((previous) => {
          const next = new Set(previous);
          if (nextSaved) {
            next.delete(profileId);
          } else {
            next.add(profileId);
          }
          return next;
        });
        addToast({
          title: t('saveError'),
          description: t('saveErrorDescription'),
          duration: 4000,
        });
      }
    },
    [addToast, isLoggedIn, onProfileUnsaved, onSaveProfile, savedIds, t],
  );

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
  const displayedProfileItems = displayedProfiles.map((profile, index) => ({
    profile,
    index,
  }));

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

  const renderProfileCard = ({ profile, index }: ProfileGridItem) => {
    const isOwnProfile = profile.id === currentProfileId;
    const canSaveProfile = saveEnabled && !isOwnProfile;

    return (
      <ProfileCard
        key={profile.id}
        profile={{
          ...profile,
          cardTheme: profile.cardTheme ?? getFreeCardTheme(index),
        }}
        isLoggedIn={isLoggedIn}
        isSaved={savedIds.has(profile.id)}
        viewerTimezone={viewerTimezone}
        onCopyUsername={handleCopyUsername}
        onToggleSave={canSaveProfile ? handleToggleSave : undefined}
        onTagClick={onTagClick}
        onLanguageClick={onLanguageClick}
        onCountryClick={onCountryClick}
        onViewProfile={onViewProfile}
        onReport={isOwnProfile ? undefined : onReport}
        onBlock={isOwnProfile ? undefined : onBlock}
        onShare={onShare}
      />
    );
  };

  return (
    <>
      <section className="flex flex-col gap-6">
        {hasProfiles ? (
          <div className="mx-auto w-full max-w-[1180px] columns-1 gap-6 md:columns-2 lg:columns-3 [&>article]:break-inside-avoid">
            {displayedProfileItems.map(renderProfileCard)}
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

      {ownsToastStack ? (
        <ToastStack
          toasts={localStack.toasts}
          onDismiss={localStack.dismissToast}
        />
      ) : null}
    </>
  );
};
