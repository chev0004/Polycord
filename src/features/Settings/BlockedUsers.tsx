'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';

type BlockedUser = { id: string; displayName: string };

const loadBlockedUsers = async (): Promise<BlockedUser[]> => {
  const response = await fetch('/api/block', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Failed to load blocks');
  return (await response.json()).users;
};

const unblockUser = async (userId: string) => {
  const response = await fetch('/api/block', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Failed to unblock');
};

export const BlockedUsers = ({
  load = loadBlockedUsers,
  unblock = unblockUser,
  onChange,
}: {
  load?: () => Promise<BlockedUser[]>;
  unblock?: (id: string) => Promise<void>;
  onChange?: () => void;
}) => {
  const t = useTranslations('Settings');
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unblockFailed, setUnblockFailed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoadFailed(false);
    setUsers(null);
    try {
      setUsers(await load());
    } catch {
      setLoadFailed(true);
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleUnblock = async (id: string) => {
    setPendingId(id);
    setUnblockFailed(false);
    try {
      await unblock(id);
      setUsers((previous) => previous?.filter((user) => user.id !== id) ?? []);
      onChange?.();
    } catch {
      setUnblockFailed(true);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section
      className="flex flex-col gap-3 border-line border-t pt-5"
      aria-label={t('blockedUsersTitle')}
    >
      <h3 className="font-semibold text-foreground">
        {t('blockedUsersTitle')}
      </h3>
      <p className="text-muted text-sm">{t('blockedUsersDescription')}</p>
      {loadFailed ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-danger text-sm"
        >
          {t('blockedUsersLoadError')}
          <Button type="button" variant="outline" onClick={reload}>
            {t('blockedUsersRetry')}
          </Button>
        </div>
      ) : users === null ? (
        <output className="text-muted text-sm">
          {t('blockedUsersLoading')}
        </output>
      ) : users.length === 0 ? (
        <output className="text-muted text-sm">{t('blockedUsersEmpty')}</output>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-background-darker p-3"
            >
              <span className="min-w-0 break-words text-foreground text-sm">
                {user.displayName}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={pendingId !== null}
                onClick={() => handleUnblock(user.id)}
                aria-label={t('unblockUserLabel', { name: user.displayName })}
              >
                {t(pendingId === user.id ? 'unblockingUser' : 'unblockUser')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {unblockFailed && (
        <p role="alert" className="text-danger text-sm">
          {t('blockedUsersUnblockError')}
        </p>
      )}
    </section>
  );
};
