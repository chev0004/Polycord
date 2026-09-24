import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MdOutlineInbox,
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from 'react-icons/md';
import { Button } from '@/components/Button';
import type { Notification, Notifications } from '@/types';
import { NotificationEntry } from './NotificationEntry';
import {
  clearNotificationsRequest,
  deleteNotificationRequest,
  fetchNotifications,
  markAllNotificationsReadRequest,
  setNotificationReadRequest,
} from './notificationRequests';

type InboxNotification = Notification & {
  read: boolean;
};

const visibleForPremium = <T extends { kind: Notification['kind'] }>(
  items: T[],
  premium: boolean,
) => items.filter((item) => premium || item.kind !== 'view');

const initializeControlled = (
  initial: Notifications,
  premium: boolean,
): InboxNotification[] =>
  visibleForPremium(initial, premium).map((n) => ({
    ...n,
    read: false,
  }));

const notificationsSignature = (initial: Notifications, premium: boolean) =>
  `${premium}:${initial.map((n) => n.id).join(',')}`;

const formatRelativeTime = (
  createdAt: string,
  t: ReturnType<typeof useTranslations<'Inbox'>>,
) => {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
  );

  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { count: hours });

  return t('daysAgo', { count: Math.floor(hours / 24) });
};

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

  const [notifications, setNotifications] = useState<InboxNotification[]>(() =>
    persist ? [] : initializeControlled(initialNotifications, premium),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [serverPremium, setServerPremium] = useState(false);
  const [loading, setLoading] = useState(persist);
  const [error, setError] = useState<'loadError' | 'writeError' | null>(null);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const viewerPremium = persist ? serverPremium : premium;
  const [isMounted, setIsMounted] = useState(false);
  const [signature, setSignature] = useState(() =>
    notificationsSignature(initialNotifications, premium),
  );
  const itemsPerPage = 5;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!persist || saving.current || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    try {
      const stored = await fetchNotifications(controller.signal);
      if (controller.signal.aborted) return;
      setNotifications(stored.notifications);
      setServerPremium(stored.premium);
      setError((previous) => (previous === 'loadError' ? null : previous));
    } catch {
      if (!controller.signal.aborted) setError('loadError');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        request.current = null;
      }
    }
  }, [persist]);

  useEffect(() => {
    void refresh();
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const interval = window.setInterval(refreshVisible, 30000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);

  if (!persist) {
    const nextSignature = notificationsSignature(initialNotifications, premium);
    if (nextSignature !== signature) {
      setSignature(nextSignature);
      setNotifications(initializeControlled(initialNotifications, premium));
      setCurrentPage(1);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = notifications.slice(startIndex, endIndex);

  const mutate = async (
    write: () => Promise<void>,
    update: (previous: InboxNotification[]) => InboxNotification[],
  ) => {
    if (saving.current) return;
    saving.current = true;
    request.current?.abort();
    request.current = null;
    setPending(true);
    setError(null);
    try {
      if (persist) await write();
      setNotifications(update);
    } catch {
      setError('writeError');
    } finally {
      saving.current = false;
      setPending(false);
    }
  };

  const handleMarkAsRead = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;

    const nextRead = !target.read;
    void mutate(
      () => setNotificationReadRequest(id, nextRead),
      (prev) => prev.map((n) => (n.id === id ? { ...n, read: nextRead } : n)),
    );
  };

  const handleDelete = (id: string) => {
    void mutate(
      () => deleteNotificationRequest(id),
      (prev) => prev.filter((n) => n.id !== id),
    );
  };

  const handleMarkAllAsRead = () => {
    void mutate(markAllNotificationsReadRequest, (prev) =>
      prev.map((n) => ({ ...n, read: true })),
    );
  };

  const handleClearAll = () => {
    void mutate(clearNotificationsRequest, () => []);
  };

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
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 text-xs"
                  disabled={pending || unreadCount === 0}
                >
                  {t('markAllRead')}
                </Button>
                <Button
                  onClick={handleClearAll}
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
                <Button
                  onClick={() => {
                    setError(null);
                    void refresh();
                  }}
                >
                  {t('retry')}
                </Button>
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
                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                    onDelete={() => handleDelete(notification.id)}
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
