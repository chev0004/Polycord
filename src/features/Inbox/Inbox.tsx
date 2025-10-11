import { Button } from '@/components/Button';
import type { Notifications } from '@/types';
import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  MdOutlineInbox,
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from 'react-icons/md';
import { NotificationEntry } from './NotificationEntry';

const initializeNotifications = (initial: Notifications) =>
  initial.map((n) => ({ ...n, read: false, isDeleting: false }));

export const Inbox = ({
  notifications: initialNotifications,
}: {
  notifications: Notifications;
}) => {
  const t = useTranslations('Inbox');

  const [notifications, setNotifications] = useState(() =>
    initializeNotifications(initialNotifications),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setNotifications(initializeNotifications(initialNotifications));
    setCurrentPage(1);
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    }, 300);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isDeleting: true })));
    setTimeout(() => {
      setNotifications([]);
    }, 300);
  };

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = notifications.slice(startIndex, endIndex);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <Popover.Root>
      <Popover.Trigger className="relative">
        <MdOutlineInbox
          className="cursor-pointer select-none text-white text-xl transition-all duration-200 hover:text-gray-300"
          size={24}
        />
        {unreadCount > 0 && (
          <span className="-top-1 -right-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-discord-blue font-bold text-white text-xs">
            {unreadCount}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent w-[540px] rounded-lg border-[1px] border-gray-500/50 bg-background-dark shadow-lg"
          side="bottom"
          align="end"
          sideOffset={5}
          collisionPadding={10}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-gray-500/50 border-b p-3">
            <h3 className="font-bold font-figtree text-lg text-white">
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

          {/* Body */}
          <div className="flex flex-col justify-between">
            <div className="flex flex-col gap-1 p-2">
              {currentNotifications.length > 0 ? (
                currentNotifications.map((notification, index) => (
                  <NotificationEntry
                    notification={notification}
                    key={notification.id}
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    onDelete={() => handleDelete(notification.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="animate-fadeInUp"
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
            </div>

            {/* Pagination Footer */}
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
