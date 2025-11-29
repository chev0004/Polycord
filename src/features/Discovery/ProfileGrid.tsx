'use client';

import { useTranslations } from 'next-intl';
import React, { type ReactNode } from 'react';
import { Toast, ToastProvider, ToastViewport } from '@/components/Toast';
import { type ToastData, useToast, useToastStack } from '@/hooks/useToast';
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

// Helper component for rendering individual toasts
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
  const { toasts, addToast, dismissToast } = useToastStack();

  const handleCopyUsername = (
    username: string,
    profileId: string,
    avatarUrl?: string,
  ) => {
    // Trigger the Toast
    addToast({
      title: t('copied'),
      description: t('copiedToClipboard', { username }),
      iconUrl: avatarUrl,
      duration: 4000,
    });

    // Fire original callback if provided
    if (onCopyUsername) {
      onCopyUsername(username, profileId);
    }
  };

  return (
    <ToastProvider>
      <section className="flex flex-col gap-6">
        {hasProfiles ? (
          <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-center gap-8">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
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

      {/* Render Toast Stack */}
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};
