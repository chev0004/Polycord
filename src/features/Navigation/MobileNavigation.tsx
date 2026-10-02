'use client';

import { useTranslations } from 'next-intl';
import { ToastStack } from '@/components/Toast';
import { getNotificationMessage } from '@/features/Inbox/NotificationEntry';
import { useInbox } from '@/features/Inbox/useInbox';
import { useIncomingNotification } from '@/features/Inbox/useIncomingNotification';
import { useToastStack } from '@/hooks/useToast';
import { MobileDock } from './MobileDock';

type MobileNavigationProps = {
  locale: string;
  userAvatarUrl?: string;
  onNavigate: (href: string) => void;
  onBump?: () => void;
  bumpReadyAt?: string;
};

export const MobileNavigation = ({
  locale,
  onNavigate,
  ...dock
}: MobileNavigationProps) => {
  const t = useTranslations('Inbox');
  const { notifications, premium, loading, unreadCount } = useInbox({
    notifications: [],
  });
  const { toasts, addToast, dismissToast } = useToastStack();

  useIncomingNotification({
    notifications,
    loading,
    onIncoming: (notification) => {
      if (notification.kind === 'view' && !premium) return;
      addToast({
        title: getNotificationMessage(notification, premium, t),
        description: '',
        iconUrl: premium ? notification.actorAvatarUrl : undefined,
        activity: {
          actionLabel:
            notification.kind === 'warning'
              ? undefined
              : premium
                ? notification.actorProfileId
                  ? t('viewProfile')
                  : undefined
                : t('seeWhoWithPremium'),
          onOpen: () => onNavigate(`/${locale}/inbox`),
        },
      });
    },
  });

  return (
    <>
      <MobileDock
        {...dock}
        locale={locale}
        unreadCount={unreadCount}
        onNavigate={onNavigate}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
