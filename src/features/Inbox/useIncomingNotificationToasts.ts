import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { type ToastData, useToastStack } from '@/hooks/useToast';
import { getNotificationMessage } from './NotificationEntry';
import type { useInbox } from './useInbox';
import { useIncomingNotification } from './useIncomingNotification';

type PendingToast = Omit<ToastData, 'id'>;

export const useIncomingNotificationToasts = ({
  inbox: { notifications, premium, loading, error },
  onOpen,
}: {
  inbox: ReturnType<typeof useInbox>;
  onOpen?: () => void;
}) => {
  const t = useTranslations('Inbox');
  const mobile = useIsMobile();
  const { toasts, addToast, dismissToast } = useToastStack();
  const [queue, setQueue] = useState<PendingToast[]>([]);

  useIncomingNotification({
    notifications,
    loading,
    loadFailed: error === 'loadError',
    onIncoming: (notification) => {
      if (notification.kind === 'view' && !premium) return;
      const message = getNotificationMessage(notification, premium, t);
      setQueue((previous) => [
        ...previous,
        {
          title: mobile ? message : t('newNotification'),
          description: mobile ? '' : message,
          iconUrl: premium ? notification.actorAvatarUrl : undefined,
          activity: onOpen && {
            actionLabel:
              notification.kind === 'warning'
                ? undefined
                : premium
                  ? notification.actorProfileId
                    ? t('viewProfile')
                    : undefined
                  : t('seeWhoWithPremium'),
            onOpen,
          },
        },
      ]);
    },
  });

  useEffect(() => {
    if (queue.length === 0) return;
    if (!mobile) {
      for (const toast of queue) addToast(toast);
      setQueue([]);
      return;
    }
    if (toasts.length > 0) return;
    addToast(queue[0]);
    setQueue(queue.slice(1));
  }, [queue, mobile, toasts.length, addToast]);

  return { toasts, dismissToast };
};
