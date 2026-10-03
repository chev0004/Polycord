import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  MdOutlineInbox,
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from 'react-icons/md';
import { Button } from '@/components/Button';
import { ToastStack } from '@/components/Toast';
import type { Notifications } from '@/types';
import { NotificationEntry } from './NotificationEntry';
import { formatRelativeTime, useInbox } from './useInbox';
import { useIncomingNotificationToasts } from './useIncomingNotificationToasts';

const headerButtonClassName =
  'h-[30px] whitespace-nowrap rounded-control border px-3 font-medium text-[13px] transition-[background-color,border-color,opacity,transform] duration-150 enabled:active:scale-[0.97] disabled:cursor-default disabled:opacity-[0.45]';

const pageButtonClassName =
  'flex h-7 w-7 items-center justify-center rounded-row text-foreground transition-colors duration-150 enabled:hover:bg-white/[0.06] focus-visible:bg-white/[0.06] disabled:cursor-default disabled:text-[#4b5563]';

export const Inbox = ({
  notifications: initialNotifications,
  premium = false,
  persist = true,
}: {
  notifications: Notifications;
  premium?: boolean;
  persist?: boolean;
}) => {
  const t = useTranslations('Inbox');
  const locale = useLocale();
  const inbox = useInbox({
    notifications: initialNotifications,
    premium,
    persist,
  });
  const {
    notifications,
    unreadCount,
    premium: viewerPremium,
    loading,
    error,
    pending,
    refresh,
    retry,
    setRead,
    remove,
    markAllRead,
    clearAll,
  } = inbox;
  const { toasts, dismissToast } = useIncomingNotificationToasts({ inbox });
  const [currentPage, setCurrentPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const itemsPerPage = 5;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = notifications.slice(startIndex, endIndex);

  const handleNextPage = () => {
    setCurrentPage(Math.min(page + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(Math.max(page - 1, 1));
  };

  const triggerContent = (
    <>
      <MdOutlineInbox
        className="cursor-pointer select-none text-foreground text-xl transition-all duration-200 hover:text-soft"
        size={24}
      />
      {unreadCount > 0 && (
        <span className="-top-[5px] -right-1.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-discord-blue px-1 font-bold text-[11px] text-foreground ring-2 ring-background-main md:ring-background-darker">
          {unreadCount}
        </span>
      )}
    </>
  );

  if (!isMounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        className="relative"
        tabIndex={-1}
      >
        {triggerContent}
      </button>
    );
  }

  const popover = (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
    >
      <Popover.Trigger
        className="-m-2 relative p-2 focus-visible:opacity-80"
        aria-label={t('notifications')}
      >
        {triggerContent}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent InboxPopover flex max-h-[min(var(--radix-popover-content-available-height),calc(100vh-88px))] w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-menu border border-gray-500/50 bg-background-dark shadow-lg"
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={10}
        >
          <div className="flex items-center justify-between gap-3 border-gray-500/50 border-b py-3 pr-3 pl-4">
            <h3 className="font-bold text-[17px] text-foreground leading-[1.2] tracking-[-0.005em]">
              {t('notifications')}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={pending || unreadCount === 0}
                className={`${headerButtonClassName} border-primary bg-primary text-[#111] enabled:hover:border-primary-light enabled:hover:bg-primary-light`}
              >
                {t('markAllRead')}
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={pending || notifications.length === 0}
                className={`${headerButtonClassName} border-gray-500/50 text-foreground enabled:hover:bg-white/5`}
              >
                {t('clearAll')}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-2 p-3 text-danger text-sm"
            >
              <p>{t(error)}</p>
              <Button onClick={retry}>{t('retry')}</Button>
            </div>
          )}
          {loading && (
            <output className="p-3 text-muted text-sm">{t('loading')}</output>
          )}
          {currentNotifications.length > 0 ? (
            <div
              key={page}
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2 [scrollbar-width:thin]"
            >
              {currentNotifications.map((notification, index) => (
                <NotificationEntry
                  notification={{
                    ...notification,
                    timestamp: notification.createdAt
                      ? formatRelativeTime(notification.createdAt, t)
                      : (notification.timestamp ?? ''),
                  }}
                  premium={viewerPremium}
                  disabled={pending}
                  last={index === currentNotifications.length - 1}
                  key={notification.id}
                  onMarkAsRead={() =>
                    setRead(notification.id, !notification.read)
                  }
                  onDelete={() => remove(notification.id)}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                />
              ))}
            </div>
          ) : !loading && !error ? (
            <div className="px-6 py-9 text-center">
              <div className="mb-1 font-semibold text-[15px] text-foreground">
                {t('noNotifications')}
              </div>
              <div className="text-[13px] text-muted [text-wrap:pretty]">
                {t('noNotificationsDescription')}
              </div>
            </div>
          ) : null}
          {!viewerPremium &&
            notifications.some(
              (notification) =>
                notification.kind === 'copy' || notification.kind === 'share',
            ) && (
              <Link
                href={`/${locale}/settings#supporter`}
                className="flex h-[38px] shrink-0 items-center justify-center border-gray-500/50 border-t font-medium text-muted text-xs transition-colors duration-150 hover:text-primary-light focus-visible:text-primary-light"
              >
                {t('seeWhoWithPremium')}
              </Link>
            )}
          {totalPages > 1 && (
            <div className="flex h-11 shrink-0 items-center justify-center gap-4 border-gray-500/50 border-t text-[13px] text-muted">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page === 1}
                aria-label={t('previousPage')}
                className={pageButtonClassName}
              >
                <MdOutlineKeyboardArrowLeft size={20} />
              </button>
              <span>{t('page', { current: page, total: totalPages })}</span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page === totalPages}
                aria-label={t('nextPage')}
                className={pageButtonClassName}
              >
                <MdOutlineKeyboardArrowRight size={20} />
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  return (
    <>
      {popover}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
