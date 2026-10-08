'use client';

import { useTranslations } from 'next-intl';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ToastStack } from '@/components/Toast';
import { useIsMobile } from '@/hooks/useMediaQuery';
import {
  calculateMatchScore,
  type MatchCriteria,
  useProfileMatching,
} from '@/hooks/useProfileMatching';
import { type ToastData, useToastStack } from '@/hooks/useToast';
import { trackClientEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';

type ProfileGridProps = {
  profiles: DiscoveryProfile[];
  onReady?: () => void;
  showBoostedBadge?: boolean;
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
  onBlock?: (profileId: string) => void | Promise<void>;
  onShare?: (profileId: string) => void;
  onModerate?: (profileId: string, trigger: HTMLElement | null) => void;
  onModerateIntent?: (profileId: string) => void;
  addToast?: (toast: Omit<ToastData, 'id'>) => void;
};

const layOutMasonry = (grid: HTMLDivElement | null) => {
  if (!grid) return;
  const layOut = () => {
    const cards = Array.from(grid.children) as HTMLElement[];
    const heights = cards.map((card) => card.getBoundingClientRect().height);
    cards.forEach((card, index) => {
      card.style.gridRowEnd = `span ${Math.ceil(heights[index])}`;
    });
    grid.style.gridAutoRows = '1px';
  };
  const sizes = new ResizeObserver(() => requestAnimationFrame(layOut));
  const observeCards = () => {
    layOut();
    sizes.disconnect();
    for (const card of grid.children) sizes.observe(card);
  };
  const cards = new MutationObserver(observeCards);
  observeCards();
  cards.observe(grid, { childList: true });
  return () => {
    sizes.disconnect();
    cards.disconnect();
  };
};

export const ProfileGrid = ({
  profiles,
  onReady,
  showBoostedBadge = true,
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
  onModerate,
  onModerateIntent,
  addToast: externalAddToast,
}: ProfileGridProps) => {
  const t = useTranslations('Discovery');
  const mobile = useIsMobile();
  const localStack = useToastStack();
  const addToast = externalAddToast ?? localStack.addToast;
  const ownsToastStack = !externalAddToast;
  const [blockingIds, setBlockingIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(savedProfileIds),
  );

  const saveEnabled = Boolean(onSaveProfile);
  useEffect(() => setSavedIds(new Set(savedProfileIds)), [savedProfileIds]);

  useEffect(() => setSavedIds(new Set(savedProfileIds)), [savedProfileIds]);

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
          variant: 'error',
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

  const keyedProfiles = useMemo(() => {
    const appearances = new Map<string, number>();
    return displayedProfiles.map((profile) => {
      const seen = appearances.get(profile.id) ?? 0;
      appearances.set(profile.id, seen + 1);
      return { profile, key: seen ? `${profile.id}:${seen}` : profile.id };
    });
  }, [displayedProfiles]);

  const hasProfiles = displayedProfiles.length > 0;

  useEffect(() => {
    if (mobile !== null) onReady?.();
  }, [mobile, onReady]);

  const handleCopyUsername = (
    username: string,
    profileId: string,
    avatarUrl: string | undefined,
    copiedToClipboard: boolean,
  ) => {
    if (copiedToClipboard && !mobile) {
      addToast({
        title: t('copied'),
        description: t('copiedToClipboard', { username }),
        iconUrl: avatarUrl,
        duration: 4000,
      });
    }

    if (!copiedToClipboard || profileId === currentProfileId) return;

    trackClientEvent(ANALYTICS_EVENTS.profileUsernameCopy, { profileId });
    onCopyUsername?.(username, profileId);
  };

  const handleBlock = async (profileId: string) => {
    if (!mobile) return onBlock?.(profileId);
    setBlockingIds((previous) => [...previous, profileId]);
    try {
      await onBlock?.(profileId);
    } finally {
      setBlockingIds((previous) => previous.filter((id) => id !== profileId));
    }
  };

  const renderProfileCard = (profile: DiscoveryProfile) => {
    const isOwnProfile = profile.id === currentProfileId;
    const canSaveProfile = saveEnabled && !isOwnProfile;

    return (
      <ProfileCard
        profile={profile}
        showBoostedBadge={showBoostedBadge}
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
        onBlock={isOwnProfile || !onBlock ? undefined : handleBlock}
        onShare={onShare}
        onModerate={isOwnProfile ? undefined : onModerate}
        onModerateIntent={isOwnProfile ? undefined : onModerateIntent}
      />
    );
  };

  return (
    <>
      <section className="flex flex-col gap-6">
        {hasProfiles ? (
          <div
            ref={layOutMasonry}
            className="mx-auto grid w-full max-w-[1180px] grid-flow-row-dense grid-cols-1 items-start gap-x-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {keyedProfiles.map(({ profile, key }) => {
              const blocking = blockingIds.includes(profile.id);
              return (
                <div key={key} className="relative" aria-busy={blocking}>
                  <div inert={blocking}>{renderProfileCard(profile)}</div>
                  {blocking ? (
                    <output className="absolute inset-x-0 top-0 bottom-6 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl bg-black/50 px-4 text-center text-foreground text-sm backdrop-blur-[1px]">
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
                      />
                      {t('blockingProfile', { name: profile.displayName })}
                    </output>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-primary-dark border-dashed bg-background-darker px-6 py-12 text-center">
            <h3 className="font-figtree font-semibold text-2xl text-foreground">
              {t('emptyStateTitle')}
            </h3>
            <p className="max-w-[440px] text-muted text-sm">
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
