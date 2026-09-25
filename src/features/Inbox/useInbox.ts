import type { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Notification, Notifications } from '@/types';
import {
  clearNotificationsRequest,
  deleteNotificationRequest,
  fetchNotifications,
  markAllNotificationsReadRequest,
  setNotificationReadRequest,
} from './notificationRequests';

export type InboxNotification = Notification & {
  read: boolean;
};

const CHANGED_EVENT = 'polycord:inbox-changed';

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

export const formatRelativeTime = (
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

export const useInbox = ({
  notifications: initialNotifications,
  premium = false,
  persist = true,
}: {
  notifications: Notifications;
  premium?: boolean;
  persist?: boolean;
}) => {
  const source = useId();
  const [notifications, setNotifications] = useState<InboxNotification[]>(() =>
    persist ? [] : initializeControlled(initialNotifications, premium),
  );
  const [serverPremium, setServerPremium] = useState(false);
  const [loading, setLoading] = useState(persist);
  const [error, setError] = useState<'loadError' | 'writeError' | null>(null);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const [signature, setSignature] = useState(() =>
    notificationsSignature(initialNotifications, premium),
  );

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
    const refreshChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail === source) return;
      request.current?.abort();
      request.current = null;
      void refresh();
    };
    const interval = window.setInterval(refreshVisible, 30000);
    window.addEventListener('focus', refreshVisible);
    window.addEventListener(CHANGED_EVENT, refreshChanged);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener(CHANGED_EVENT, refreshChanged);
      document.removeEventListener('visibilitychange', refreshVisible);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh, source]);

  if (!persist) {
    const nextSignature = notificationsSignature(initialNotifications, premium);
    if (nextSignature !== signature) {
      setSignature(nextSignature);
      setNotifications(initializeControlled(initialNotifications, premium));
    }
  }

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
      if (persist) {
        await write();
        window.dispatchEvent(
          new CustomEvent(CHANGED_EVENT, { detail: source }),
        );
      }
      setNotifications(update);
    } catch {
      setError('writeError');
    } finally {
      saving.current = false;
      setPending(false);
    }
  };

  const setRead = (id: string, read: boolean) =>
    mutate(
      () => setNotificationReadRequest(id, read),
      (previous) => previous.map((n) => (n.id === id ? { ...n, read } : n)),
    );

  const remove = (id: string) =>
    mutate(
      () => deleteNotificationRequest(id),
      (previous) => previous.filter((n) => n.id !== id),
    );

  const markAllRead = () =>
    mutate(markAllNotificationsReadRequest, (previous) =>
      previous.map((n) => ({ ...n, read: true })),
    );

  const clearAll = () => mutate(clearNotificationsRequest, () => []);

  const retry = () => {
    setError(null);
    void refresh();
  };

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    premium: persist ? serverPremium : premium,
    loading,
    error,
    pending,
    refresh,
    retry,
    setRead,
    remove,
    markAllRead,
    clearAll,
  };
};
