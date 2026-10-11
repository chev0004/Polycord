import type { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  isNoticePending,
  type Notification,
  type Notifications,
} from '@/types';
import {
  acknowledgeNoticeRequest,
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
  const [readUpdates, setReadUpdates] = useState<Record<string, boolean>>({});
  const readWrites = useRef(new Map<string, Promise<void>>());
  const request = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const refreshPending = useRef(false);
  const [signature, setSignature] = useState(() =>
    notificationsSignature(initialNotifications, premium),
  );

  const refresh = useCallback(async () => {
    if (!persist || request.current) return;
    if (saving.current || readWrites.current.size > 0) {
      refreshPending.current = true;
      return;
    }
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
    if (!persist) return;
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
    const refreshPushed = (event: MessageEvent) => {
      if (event.data?.type !== 'push') return;
      request.current?.abort();
      request.current = null;
      void refresh();
    };
    const worker = navigator.serviceWorker;
    window.addEventListener('focus', refreshVisible);
    window.addEventListener(CHANGED_EVENT, refreshChanged);
    document.addEventListener('visibilitychange', refreshVisible);
    worker?.addEventListener('message', refreshPushed);
    worker?.startMessages();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      window.removeEventListener(CHANGED_EVENT, refreshChanged);
      document.removeEventListener('visibilitychange', refreshVisible);
      worker?.removeEventListener('message', refreshPushed);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh, source, persist]);

  if (!persist) {
    const nextSignature = notificationsSignature(initialNotifications, premium);
    if (nextSignature !== signature) {
      setSignature(nextSignature);
      setNotifications(initializeControlled(initialNotifications, premium));
    }
  }

  const visibleNotifications = notifications.map((n) =>
    readUpdates[n.id] === undefined ? n : { ...n, read: readUpdates[n.id] },
  );
  const canMarkAllRead = visibleNotifications.some(
    (n) => !n.read && !isNoticePending(n),
  );

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
      await Promise.all(readWrites.current.values());
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
      if (refreshPending.current) {
        refreshPending.current = false;
        void refresh();
      }
    }
  };

  const updateRead = (
    ids: string[],
    read: boolean,
    write: () => Promise<void>,
  ) => {
    if (saving.current || ids.length === 0) return;
    request.current?.abort();
    request.current = null;
    setError(null);
    setReadUpdates((previous) => ({
      ...previous,
      ...Object.fromEntries(ids.map((id) => [id, read])),
    }));
    const targets = new Set(ids);
    const operation: Promise<void> = Promise.all(
      ids.map((id) => readWrites.current.get(id)),
    ).then(async () => {
      try {
        if (persist) await write();
        setNotifications((previous) =>
          previous.map((n) => (targets.has(n.id) ? { ...n, read } : n)),
        );
      } catch {
        setError('writeError');
      } finally {
        const settledIds = ids.filter(
          (id) => readWrites.current.get(id) === operation,
        );
        for (const id of settledIds) readWrites.current.delete(id);
        setReadUpdates((previous) => {
          const next = { ...previous };
          for (const id of settledIds) delete next[id];
          return next;
        });
        if (readWrites.current.size === 0) {
          if (persist)
            window.dispatchEvent(
              new CustomEvent(CHANGED_EVENT, { detail: source }),
            );
          if (refreshPending.current) {
            refreshPending.current = false;
            void refresh();
          }
        }
      }
    });
    for (const id of ids) readWrites.current.set(id, operation);
    return operation;
  };

  const setRead = (id: string, read: boolean) =>
    updateRead([id], read, () => setNotificationReadRequest(id, read));

  const remove = (id: string) =>
    mutate(
      () => deleteNotificationRequest(id),
      (previous) => previous.filter((n) => n.id !== id),
    );

  const acknowledge = (id: string) =>
    mutate(
      () => acknowledgeNoticeRequest(id),
      (previous) =>
        previous.map((n) =>
          n.id === id
            ? { ...n, read: true, acknowledgedAt: new Date().toISOString() }
            : n,
        ),
    );

  const markAllRead = () => {
    if (!canMarkAllRead) return;
    return updateRead(
      notifications.filter((n) => !isNoticePending(n)).map((n) => n.id),
      true,
      markAllNotificationsReadRequest,
    );
  };

  const clearAll = () =>
    mutate(clearNotificationsRequest, (previous) =>
      previous.filter(isNoticePending),
    );

  const retry = () => {
    setError(null);
    void refresh();
  };

  return {
    notifications: visibleNotifications,
    unreadCount: visibleNotifications.filter((n) => !n.read).length,
    pendingNotice: visibleNotifications.find(isNoticePending),
    premium: persist ? serverPremium : premium,
    loading,
    error,
    pending,
    canMarkAllRead,
    refresh,
    retry,
    setRead,
    remove,
    acknowledge,
    markAllRead,
    clearAll,
  };
};
