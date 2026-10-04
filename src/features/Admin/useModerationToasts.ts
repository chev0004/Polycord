'use client';

import { useTranslations } from 'next-intl';
import { type ToastData, useToastStack } from '@/hooks/useToast';
import type { Notify } from './ModerationDesktop';

export const useModerationNotify = (
  addToast: (toast: Omit<ToastData, 'id'>) => void,
) => {
  const t = useTranslations('Admin');

  const notify: Notify = (user, action, { days, reports, resolved, failed }) =>
    addToast({
      variant: failed ? 'error' : undefined,
      title: failed
        ? t('actionFailed')
        : t(`toast_${action}`, {
            name: user.displayName,
            count: action === 'dismiss' ? reports : (days ?? 0),
          }),
      description: failed
        ? ''
        : resolved && reports
          ? action === 'dismiss'
            ? t('toastMovedResolved')
            : t('toastReviewed', { count: reports })
          : t('toastLogged'),
      iconUrl: user.avatarUrl,
      duration: 4000,
    });

  return notify;
};

export const useModerationToasts = () => {
  const { toasts, addToast, dismissToast } = useToastStack();
  const notify = useModerationNotify(addToast);

  return { notify, toasts, dismissToast };
};
