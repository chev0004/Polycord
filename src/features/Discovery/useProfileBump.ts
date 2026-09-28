'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useNavbarBump } from '@/features/Navigation/AppShell';
import type { ToastData } from '@/hooks/useToast';
import {
  BumpProfileError,
  type BumpProfileResponse,
  bumpProfileRequest,
} from './bumpProfileRequest';

const BUMP_TOAST_DURATION = 4000;

type UseProfileBumpOptions = {
  profileId?: string;
  readyAt?: string;
  avatarUrl?: string;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  request?: () => Promise<BumpProfileResponse>;
  onBumped?: (result: BumpProfileResponse) => Promise<void> | void;
};

export const useProfileBump = ({
  profileId,
  readyAt: initialReadyAt,
  avatarUrl,
  addToast,
  request = bumpProfileRequest,
  onBumped,
}: UseProfileBumpOptions) => {
  const t = useTranslations('Discovery');
  const [isBumping, setIsBumping] = useState(false);
  const [readyAt, setReadyAt] = useState(initialReadyAt);

  useEffect(() => {
    setReadyAt(initialReadyAt);
  }, [initialReadyAt]);

  const formatRemaining = (ms: number) => {
    const minutes = Math.max(1, Math.ceil(ms / 60000));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours && rest) {
      return t('bumpCooldownHoursMinutes', { hours, minutes: rest });
    }

    return hours
      ? t('bumpCooldownHours', { count: hours })
      : t('bumpCooldownMinutes', { count: minutes });
  };

  const bump = async () => {
    if (isBumping) {
      return;
    }

    if (!profileId) {
      addToast({
        title: t('bumpNeedsProfileTitle'),
        description: t('bumpNeedsProfileDescription'),
        duration: BUMP_TOAST_DURATION,
      });
      return;
    }

    setIsBumping(true);

    try {
      const result = await request();
      await onBumped?.(result);
      setReadyAt(result.nextBumpAt);
      addToast({
        title: t('bumpSuccessTitle'),
        description: t('bumpSuccessDescription'),
        iconUrl: avatarUrl,
        duration: BUMP_TOAST_DURATION,
      });
    } catch (error) {
      const cooldown =
        error instanceof BumpProfileError && error.status === 429
          ? error.remainingMs
          : undefined;

      if (cooldown) {
        setReadyAt(new Date(Date.now() + cooldown).toISOString());
      }

      addToast({
        title: cooldown ? t('bumpCooldownTitle') : t('bumpErrorTitle'),
        description: cooldown
          ? t('bumpCooldownDescription', { time: formatRemaining(cooldown) })
          : t('bumpErrorDescription'),
        duration: BUMP_TOAST_DURATION,
      });
    } finally {
      setIsBumping(false);
    }
  };

  useNavbarBump(bump, readyAt);
};
