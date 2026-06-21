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

const initializeNotifications = (initial: Notifications, premium: boolean) =>
  initial
    .filter((notification) => premium || notification.kind === 'copy')
    .map((n) => ({ ...n, read: false, isDeleting: false }));

const notificationsSignature = (initial: Notifications, premium: boolean) =>
  `${premium}:${initial.map((n) => n.id).join(',')}`;

export const Inbox = ({
  notifications: initialNotifications,
  premium = false,
}: {
  notifications: Notifications;
  premium?: boolean;
}) => {
  const t = useTranslations('Inbox');
  const locale = useLocale();

  const [notifications, setNotifications] = useState(() =>
    initializeNotifications(initialNotifications, premium),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [signature, setSignature] = useState(() =>
    notificationsSignature(initialNotifications, premium),
  );
  const itemsPerPage = 5;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const nextSignature = notificationsSignature(initialNotifications, premium);
  if (nextSignature !== signature) {
    setSignature(nextSignature);
    setNotifications(initializeNotifications(initialNotifications, premium));
    setCurrentPage(1);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = notifications.slice(startIndex, endIndex);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isDeleting: true } : n)),
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 400); // Matched to slideOutRight animation duration
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;

    const visibleIds = new Set(currentNotifications.map((n) => n.id));

    setNotifications((prev) =>
      prev.map((n) => (visibleIds.has(n.id) ? { ...n, isDeleting: true } : n)),
    );

    const staggerDelay = 100;
    const animationDuration = 400;
    const totalDuration =
      animationDuration + currentNotifications.length * staggerDelay;

    setTimeout(() => {
      setNotifications([]);
      setCurrentPage(1);
    }, totalDuration);
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const triggerContent = (
    <>
      <MdOutlineInbox
        className="cursor-pointer select-none text-white text-xl transition-all duration-200 hover:text-gray-300"
        size={24}
      />
      {unreadCount > 0 && (
        <span className="-top-[5px] -right-1.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-discord-blue px-1 font-bold text-[11px] text-white">
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
    <Popover.Root>
      <Popover.Trigger className="relative" aria-label={t('notifications')}>
        {triggerContent}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent w-[420px] overflow-hidden rounded-[18px] border border-gray-500/50 bg-background-dark shadow-lg"
          side="bottom"
          align="end"
          sideOffset={5}
          collisionPadding={10}
        >
          <div className="flex items-center justify-between border-gray-500/50 border-b p-3">
            <h3 className="font-bold text-base text-white">
              {t('notifications')}
            </h3>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 text-xs"
                  disabled={unreadCount === 0}
                >
                  {t('markAllRead')}
                </Button>
                <Button
                  onClick={handleClearAll}
                  className="px-2 py-1 text-xs"
                  disabled={notifications.length === 0}
                  variant="outline"
                >
                  {t('clearAll')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between">
            <div className="flex flex-col gap-1 overflow-hidden p-2">
              {currentNotifications.length > 0 ? (
                currentNotifications.map((notification, index) => (
                  <NotificationEntry
                    notification={notification}
                    premium={premium}
                    key={notification.id}
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    onDelete={() => handleDelete(notification.id)}
                    style={{
                      animationDelay: notification.isDeleting
                        ? `${index * 100}ms`
                        : `${index * 50}ms`,
                    }}
                    className={
                      notification.isDeleting ? '' : 'animate-fadeInUp'
                    }
                  />
                ))
              ) : (
                <div className="flex h-[290px] flex-col items-center justify-center gap-4">
                  <MdOutlineInbox size={48} className="text-gray-500" />
                  <p className="text-center text-gray-400 text-sm">
                    {t('noNotifications')}
                    <br />
                    <span className="text-xs">
                      {t('noNotificationsDescription')}
                    </span>
                  </p>
                </div>
              )}
              {!premium && currentNotifications.length > 0 && (
                <Link
                  href={`/${locale}/settings#premium`}
                  className="rounded-md px-3 py-2.5 font-semibold text-[13px] text-primary-light transition-colors hover:bg-background-main hover:text-primary-lighter"
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
                  disabled={currentPage === 1}
                  className="text-white transition-colors duration-200 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdOutlineKeyboardArrowLeft size={20} />
                </button>
                <span className="text-gray-400 text-xs">
                  {t('page', { current: currentPage, total: totalPages })}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="text-white transition-colors duration-200 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
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
