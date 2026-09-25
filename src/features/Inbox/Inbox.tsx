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
import type { Notifications } from '@/types';
import { NotificationEntry } from './NotificationEntry';
import { formatRelativeTime, useInbox } from './useInbox';

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
  } = useInbox({ notifications: initialNotifications, premium, persist });
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
        <span className="-top-[5px] -right-1.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-discord-blue px-1 font-bold text-[11px] text-foreground">
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

  return (
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
          className="PopoverContent max-h-[var(--radix-popover-content-available-height)] w-[420px] max-w-[calc(100vw-20px)] overflow-y-auto rounded-[18px] border border-gray-500/50 bg-background-dark shadow-lg"
          side="bottom"
          align="end"
          sideOffset={5}
          collisionPadding={10}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-gray-500/50 border-b p-3">
            <h3 className="font-bold text-base text-foreground">
              {t('notifications')}
            </h3>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={markAllRead}
                  className="px-2 py-1 text-xs"
                  disabled={pending || unreadCount === 0}
                >
                  {t('markAllRead')}
                </Button>
                <Button
                  onClick={clearAll}
                  className="px-2 py-1 text-xs"
                  disabled={pending || notifications.length === 0}
                  variant="outline"
                >
                  {t('clearAll')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between">
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
            <div className="flex flex-col gap-1 overflow-hidden p-2">
              {currentNotifications.length > 0 ? (
                currentNotifications.map((notification, index) => (
                  <NotificationEntry
                    notification={{
                      ...notification,
                      timestamp: notification.createdAt
                        ? formatRelativeTime(notification.createdAt, t)
                        : (notification.timestamp ?? ''),
                    }}
                    premium={viewerPremium}
                    disabled={pending}
                    key={notification.id}
                    onMarkAsRead={() =>
                      setRead(notification.id, !notification.read)
                    }
                    onDelete={() => remove(notification.id)}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                    className="animate-fadeInUp"
                  />
                ))
              ) : !loading && !error ? (
                <div className="flex h-[290px] flex-col items-center justify-center gap-4">
                  <MdOutlineInbox size={48} className="text-subtle" />
                  <p className="text-center text-muted text-sm">
                    {t('noNotifications')}
                    <br />
                    <span className="text-xs">
                      {t('noNotificationsDescription')}
                    </span>
                  </p>
                </div>
              ) : null}
              {!viewerPremium &&
                currentNotifications.some(
                  (notification) => notification.kind === 'copy',
                ) && (
                  <Link
                    href={`/${locale}/settings#premium`}
                    className="rounded-md px-3 py-2.5 font-semibold text-[13px] text-primary-light transition-colors hover:bg-background-main hover:text-primary-lighter focus-visible:bg-background-main focus-visible:text-primary-lighter"
                  >
                    {t('seeWhoWithPremium')}
                  </Link>
                )}
            </div>

            {totalPages > 1 && (
              <div className="flex h-[41px] items-center justify-center gap-4 border-gray-500/50 border-t">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  aria-label={t('previousPage')}
                  className="text-foreground transition-colors duration-200 hover:text-soft focus-visible:text-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdOutlineKeyboardArrowLeft size={20} />
                </button>
                <span className="text-muted text-xs">
                  {t('page', { current: page, total: totalPages })}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  aria-label={t('nextPage')}
                  className="text-foreground transition-colors duration-200 hover:text-soft focus-visible:text-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdOutlineKeyboardArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
