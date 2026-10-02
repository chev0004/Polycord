'use client';

import { ToastStack } from '@/components/Toast';
import { useInbox } from '@/features/Inbox/useInbox';
import { useIncomingNotificationToasts } from '@/features/Inbox/useIncomingNotificationToasts';
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
  const inbox = useInbox({ notifications: [] });
  const { toasts, dismissToast } = useIncomingNotificationToasts({
    inbox,
    onOpen: () => onNavigate(`/${locale}/inbox`),
  });

  return (
    <>
      <MobileDock
        {...dock}
        locale={locale}
        unreadCount={inbox.unreadCount}
        onNavigate={onNavigate}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
