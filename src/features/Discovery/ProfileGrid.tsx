'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';

type ProfileGridProps = {
  profiles: DiscoveryProfile[];
  emptyState?: ReactNode;
  isLoggedIn?: boolean;
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

export const ProfileGrid = ({
  profiles,
  emptyState,
  isLoggedIn = false,
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
  const hasProfiles = profiles.length > 0;

  return (
    <section className="flex flex-col gap-6">
      {hasProfiles ? (
        <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-center gap-8">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isLoggedIn={isLoggedIn}
              onCopyUsername={onCopyUsername}
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-primary/30 border-dashed bg-background-darker/60 p-10 text-center">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary text-xs uppercase tracking-wide">
            {t('emptyStateBadge')}
          </span>
          <h3 className="font-figtree font-semibold text-2xl text-white">
            {t('emptyStateTitle')}
          </h3>
          <p className="max-w-md text-gray-400 text-sm">
            {emptyState ?? t('emptyStateDescription')}
          </p>
        </div>
      )}
    </section>
  );
};
