'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ToastStack } from '@/components/Toast';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ReportDialog } from '@/features/Discovery/ReportDialog';
import {
  blockProfileRequest,
  ReportProfileError,
  type ReportReason,
  reportProfileRequest,
} from '@/features/Discovery/safetyRequests';
import {
  buildPublicProfileUrl,
  copyProfileUrl,
} from '@/features/Discovery/shareProfile';
import { notifyUsernameCopied } from '@/features/Inbox/notificationRequests';
import { useToastStack } from '@/hooks/useToast';
import { trackClientEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { copyText } from '@/lib/clipboard';

export const useProfileActions = (
  locale: string,
  isLoggedIn: boolean,
  onBlocked: (id: string) => void,
) => {
  const t = useTranslations('Discovery');
  const { toasts, addToast, dismissToast } = useToastStack();
  const [reportTarget, setReportTarget] = useState<DiscoveryProfile | null>(
    null,
  );

  const report = (profile: DiscoveryProfile) => {
    if (!isLoggedIn) {
      addToast({
        title: t('reportLoginTitle'),
        description: t('reportLoginDescription'),
        duration: 4000,
      });
      return;
    }
    setReportTarget(profile);
  };

  const submitReport = async (reason: ReportReason, details: string) => {
    if (!reportTarget) return;
    try {
      await reportProfileRequest(reportTarget.id, reason, details || undefined);
      addToast({
        title: t('reportSuccessTitle'),
        description: t('reportSuccessDescription'),
        duration: 4000,
      });
    } catch (error) {
      const limited =
        error instanceof ReportProfileError && error.status === 429;
      addToast({
        title: limited ? t('reportCooldownTitle') : t('reportErrorTitle'),
        description: limited
          ? t('reportCooldownDescription')
          : t('reportErrorDescription'),
        duration: 4000,
      });
      throw error;
    }
  };

  const block = async (profileId: string) => {
    if (!isLoggedIn) {
      addToast({
        title: t('blockLoginTitle'),
        description: t('blockLoginDescription'),
        duration: 4000,
      });
      return;
    }
    try {
      await blockProfileRequest(profileId, true);
      onBlocked(profileId);
      addToast({
        title: t('blockSuccessTitle'),
        description: t('blockSuccessDescription'),
        duration: 4000,
      });
    } catch {
      addToast({
        title: t('blockErrorTitle'),
        description: t('blockErrorDescription'),
        duration: 4000,
      });
    }
  };

  const share = async (profileId: string) => {
    const copied = await copyProfileUrl(
      buildPublicProfileUrl(locale, profileId),
    );
    addToast({
      title: t(copied ? 'shareCopiedTitle' : 'shareErrorTitle'),
      description: t(
        copied ? 'shareCopiedDescription' : 'shareErrorDescription',
      ),
      duration: 4000,
    });
  };

  const copyUsername = async ({ id, discordUsername }: DiscoveryProfile) => {
    if (!discordUsername) return false;
    const copiedToClipboard = await copyText(discordUsername);
    trackClientEvent(ANALYTICS_EVENTS.profileUsernameCopy);
    if (isLoggedIn) void notifyUsernameCopied(id).catch(() => {});
    if (copiedToClipboard) {
      addToast({
        title: t('copied'),
        description: t('copiedToClipboard', {
          username: discordUsername,
        }),
        duration: 4000,
      });
    }
    return copiedToClipboard;
  };

  return {
    report,
    block,
    share,
    copyUsername,
    addToast,
    feedback: (
      <>
        <ReportDialog
          open={reportTarget !== null}
          onOpenChange={(open) => {
            if (!open) setReportTarget(null);
          }}
          profileName={reportTarget?.displayName}
          onSubmit={submitReport}
        />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    ),
  };
};
