'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { ToastStack } from '@/components/Toast';
import { InboxContent } from '@/features/Inbox/InboxPage';
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
  const t = useTranslations('Inbox');
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const inbox = useInbox({ notifications: [] });
  const { toasts, dismissToast } = useIncomingNotificationToasts({
    inbox,
    onOpen: () => setOpenPath(pathname),
  });

  if (openPath !== null && openPath !== pathname) setOpenPath(null);

  return (
    <>
      <MobileDock
        {...dock}
        locale={locale}
        unreadCount={inbox.unreadCount}
        onNavigate={(href) => {
          if (href === `/${locale}/inbox`) setOpenPath(pathname);
          else onNavigate(href);
        }}
      />
      <Sheet
        open={openPath === pathname}
        onOpenChange={(open) => setOpenPath(open ? pathname : null)}
        title={t('title')}
        full
        bare
        flush
        style={{ backgroundColor: 'var(--color-background-main)' }}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          <InboxContent inbox={inbox} onClose={() => setOpenPath(null)} />
        </div>
      </Sheet>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
