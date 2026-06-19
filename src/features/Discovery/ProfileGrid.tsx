'use client';

import { useTranslations } from 'next-intl';
import React, { type ReactNode } from 'react';
import { Toast, ToastProvider, ToastViewport } from '@/components/Toast';
import { type ToastData, useToast, useToastStack } from '@/hooks/useToast';
import { getFreeCardTheme } from './cardTheme';
import type { ViewerMatchProfile } from './discoveryMatch';
import { type DiscoveryProfile, ProfileCard } from './ProfileCard';

type ProfileGridProps = {
  profiles: DiscoveryProfile[];
  emptyState?: ReactNode;
  isLoggedIn?: boolean;
  viewer?: ViewerMatchProfile | null;
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

type ProfileGridItem = {
  profile: DiscoveryProfile;
  index: number;
};

const splitIntoColumns = <T,>(items: T[], columnCount: number) => {
  const columnSize = Math.ceil(items.length / columnCount);

  return Array.from({ length: columnCount }, (_, columnIndex) =>
    items.slice(columnIndex * columnSize, (columnIndex + 1) * columnSize),
  ).filter((column) => column.length > 0);
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
  viewer = null,
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

  const hasProfiles = profiles.length > 0;
  const displayedProfileItems = profiles.map((profile, index) => ({
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

  const renderProfileCard = ({ profile, index }: ProfileGridItem) => (
    <ProfileCard
      key={profile.id}
      profile={{
        ...profile,
        cardTheme: profile.cardTheme ?? getFreeCardTheme(index),
      }}
      isLoggedIn={isLoggedIn}
      viewer={viewer}
      onCopyUsername={handleCopyUsername}
      onTagClick={onTagClick}
      onLanguageClick={onLanguageClick}
      onCountryClick={onCountryClick}
      onViewProfile={onViewProfile}
      onReport={onReport}
      onBlock={onBlock}
      onShare={onShare}
    />
  );

  const renderProfileColumns = (columnCount: number, className: string) => (
    <div className={`mx-auto w-full max-w-[1180px] gap-6 ${className}`}>
      {splitIntoColumns(displayedProfileItems, columnCount).map((column) => (
        <div
          key={`profile-column-${columnCount}-${column[0].profile.id}`}
          className="flex min-w-0 flex-col"
        >
          {column.map(renderProfileCard)}
        </div>
      ))}
    </div>
  );

  return (
    <ToastProvider>
      <section className="flex flex-col gap-6">
        {hasProfiles ? (
          <>
            {renderProfileColumns(1, 'grid grid-cols-1 md:hidden')}
            {renderProfileColumns(2, 'hidden md:grid md:grid-cols-2 lg:hidden')}
            {renderProfileColumns(3, 'hidden lg:grid lg:grid-cols-3')}
          </>
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
