import { useEffect, useRef } from 'react';
import type { InboxNotification } from './useInbox';

export const useIncomingNotification = ({
  notifications,
  loading,
  loadFailed,
  onIncoming,
}: {
  notifications: InboxNotification[];
  loading: boolean;
  loadFailed: boolean;
  onIncoming: (notification: InboxNotification) => void;
}) => {
  const seen = useRef<Set<string> | null>(null);
  const handler = useRef(onIncoming);

  useEffect(() => {
    handler.current = onIncoming;
  });

  useEffect(() => {
    if (loading || loadFailed) return;
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const known = seen.current;
    const incoming = notifications.filter((n) => !n.read && !known.has(n.id));
    for (const n of notifications) known.add(n.id);
    for (const n of incoming.reverse()) handler.current(n);
  }, [notifications, loading, loadFailed]);
};
