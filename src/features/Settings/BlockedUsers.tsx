'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { MdSearch } from 'react-icons/md';
import { Button } from '@/components/Button';
import { buildDiscoveryFilterHref } from '@/features/Discovery/discoveryUrlState';
import { MobileProfileSheet } from '@/features/Discovery/MobileProfileSheet';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { blockedProfileIds } from '@/features/Discovery/safetyRequests';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { ProfileDetail } from '@/features/Profile/ProfileDetail';
import { useProfileActions } from '@/features/Profile/useProfileActions';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { copyText } from '@/lib/clipboard';

type BlockedUser = {
  id: string;
  displayName: string;
  username?: string;
  profile: DiscoveryProfile | null;
};

const loadBlockedUsers = async (): Promise<BlockedUser[]> => {
  const response = await fetch('/api/block', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Failed to load blocks');
  return (await response.json()).users;
};

const BlockedProfilePreview = ({
  profile,
  open,
  onOpenChange,
}: {
  profile: DiscoveryProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouteProgressRouter();
  const mobile = useIsMobile();
  const actions = useProfileActions(locale, true, () => {});

  if (mobile)
    return (
      <MobileProfileSheet
        profile={profile}
        open={open}
        onOpenChange={onOpenChange}
        isLoggedIn
      />
    );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 flex animate-[sheetFadeIn_150ms_ease-out] overflow-y-auto bg-black/60 p-6 backdrop-blur-sm">
          <Dialog.Content
            aria-describedby={undefined}
            className="m-auto w-full max-w-[1032px] animate-popIn outline-none"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Dialog.Title className="sr-only">
              {t('blockedPreviewTitle')}
            </Dialog.Title>
            <ProfileDetail
              profile={profile}
              isLoggedIn
              onCopyUsername={() => copyText(profile.discordUsername ?? '')}
              onShare={() => actions.share(profile)}
              onReport={() => actions.report(profile)}
              onTagClick={(tag) =>
                router.push(buildDiscoveryFilterHref(locale, 'tag', tag))
              }
              onLanguageClick={(language, isPrimary) =>
                router.push(
                  buildDiscoveryFilterHref(
                    locale,
                    isPrimary ? 'primaryLanguage' : 'targetLanguage',
                    language,
                  ),
                )
              }
              onCountryClick={(country) =>
                router.push(
                  buildDiscoveryFilterHref(locale, 'country', country),
                )
              }
            />
            {actions.feedback}
          </Dialog.Content>
        </Dialog.Overlay>
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
  const [query, setQuery] = useState('');
  const [previewProfile, setPreviewProfile] = useState<DiscoveryProfile | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
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
    const profileId = users?.find((user) => user.id === id)?.profile?.id;
    setPendingId(id);
    setUnblockFailed(false);
    try {
      await unblock(id);
      if (profileId) blockedProfileIds.delete(profileId);
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
                {user.profile ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="[@media(hover:none)]:hover:bg-transparent"
                    onClick={() => {
                      setPreviewProfile(user.profile);
                      setPreviewOpen(true);
                    }}
                    aria-label={t('previewBlockedUserLabel', {
                      name: user.displayName,
                    })}
                  >
                    {t('previewBlockedUser')}
                  </Button>
                ) : null}
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
      {previewProfile ? (
        <BlockedProfilePreview
          profile={previewProfile}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      ) : null}
    </section>
  );
};
