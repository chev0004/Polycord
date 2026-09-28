'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { MdClose, MdSearch } from 'react-icons/md';
import { Button } from '@/components/Button';
import {
  type DiscoveryProfile,
  ProfileCard,
} from '@/features/Discovery/ProfileCard';

type BlockedUser = { id: string; displayName: string; username?: string };
type LoadPreview = (userId: string) => Promise<DiscoveryProfile | null>;

const loadBlockedUsers = async (): Promise<BlockedUser[]> => {
  const response = await fetch('/api/block', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Failed to load blocks');
  return (await response.json()).users;
};

const loadBlockedProfile: LoadPreview = async (userId) => {
  const response = await fetch(`/api/block/${userId}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to load profile');
  return (await response.json()).profile;
};

const BlockedProfilePreview = ({
  user,
  load,
  onClose,
}: {
  user: BlockedUser | null;
  load: LoadPreview;
  onClose: () => void;
}) => {
  const t = useTranslations('Settings');
  const [preview, setPreview] = useState<
    DiscoveryProfile | 'loading' | 'unavailable' | 'error'
  >('loading');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setPreview('loading');
    load(user.id).then(
      (profile) => active && setPreview(profile ?? 'unavailable'),
      () => active && setPreview('error'),
    );
    return () => {
      active = false;
    };
  }, [user, load]);

  return (
    <Dialog.Root
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease-out]" />
        <Dialog.Content
          className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(420px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-2xl bg-background-dark p-5 shadow-xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Dialog.Title className="font-figtree font-semibold text-foreground text-lg">
                {t('blockedPreviewTitle')}
              </Dialog.Title>
              <Dialog.Description className="text-muted text-sm">
                {t('blockedPreviewDescription', {
                  name: user?.displayName ?? '',
                })}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-background-main hover:text-foreground focus-visible:bg-background-main focus-visible:text-foreground"
              aria-label={t('blockedPreviewClose')}
            >
              <MdClose size={18} />
            </Dialog.Close>
          </div>
          {preview === 'loading' ? (
            <output className="text-muted text-sm">
              {t('blockedPreviewLoading')}
            </output>
          ) : preview === 'unavailable' || preview === 'error' ? (
            <p role="alert" className="text-muted text-sm">
              {t(
                preview === 'error'
                  ? 'blockedPreviewError'
                  : 'blockedPreviewUnavailable',
              )}
            </p>
          ) : (
            <ProfileCard profile={preview} variant="preview" isLoggedIn />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
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
  preview = loadBlockedProfile,
  onChange,
}: {
  load?: () => Promise<BlockedUser[]>;
  unblock?: (id: string) => Promise<void>;
  preview?: LoadPreview;
  onChange?: () => void;
}) => {
  const t = useTranslations('Settings');
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unblockFailed, setUnblockFailed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [previewUser, setPreviewUser] = useState<BlockedUser | null>(null);
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

  const search = query.trim().toLocaleLowerCase();
  const shown = (users ?? []).filter((user) =>
    [user.displayName, user.username ?? ''].some((value) =>
      value.toLocaleLowerCase().includes(search),
    ),
  );

  return (
    <section
      className="flex flex-col gap-3"
      aria-label={t('blockedUsersTitle')}
    >
      {users?.length ? (
        <label className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-background-darker pr-2 pl-4 text-subtle focus-within:border-primary">
          <MdSearch size={20} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            placeholder={t('blockedUsersSearchPlaceholder')}
            aria-label={t('blockedUsersSearchLabel')}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
          />
        </label>
      ) : null}
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
      ) : shown.length === 0 ? (
        <output className="text-muted text-sm">
          {t('blockedUsersNoMatches')}
        </output>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background-darker p-3"
            >
              <div className="min-w-0">
                <p className="break-words text-foreground text-sm">
                  {user.displayName}
                </p>
                {user.username ? (
                  <p className="break-words text-muted text-xs">
                    {t('blockedUserHandle', { username: user.username })}
                  </p>
                ) : null}
              </div>
              <div className="ml-auto flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewUser(user)}
                  aria-label={t('previewBlockedUserLabel', {
                    name: user.displayName,
                  })}
                >
                  {t('previewBlockedUser')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingId !== null}
                  onClick={() => handleUnblock(user.id)}
                  aria-label={t('unblockUserLabel', { name: user.displayName })}
                >
                  {t(pendingId === user.id ? 'unblockingUser' : 'unblockUser')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {unblockFailed && (
        <p role="alert" className="text-danger text-sm">
          {t('blockedUsersUnblockError')}
        </p>
      )}
      <BlockedProfilePreview
        user={previewUser}
        load={preview}
        onClose={() => setPreviewUser(null)}
      />
    </section>
  );
};
