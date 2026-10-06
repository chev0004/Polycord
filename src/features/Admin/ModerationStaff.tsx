'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { MdClose, MdPersonAdd } from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { AccountPicker } from './AccountPicker';
import { ActionError, modButton, Spinner } from './ModerationParts';
import type { ModUser } from './types';
import { isReauthError, type ModerationStore } from './useModeration';

const StaffRow = ({
  user,
  mobile,
  children,
}: {
  user: ModUser;
  mobile: boolean;
  children: ReactNode;
}) => (
  <div
    className={`flex items-center gap-2.5 ${mobile ? 'min-h-14 px-4 py-2.5' : 'rounded-xl p-2'}`}
  >
    <Avatar avatarUrl={user.avatarUrl} size="sm" />
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold text-[13px] text-foreground">
        {user.displayName}
      </p>
      <p className="truncate text-[11.5px] text-subtle">@{user.username}</p>
    </div>
    {children}
  </div>
);

export const StaffPanel = ({
  store,
  mobile = false,
}: {
  store: ModerationStore;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<'failed' | 'reauth' | null>(null);
  const members = store.staff.flatMap((id) => store.usersById.get(id) ?? []);

  const run = async (userId: string, change: () => Promise<void>) => {
    setBusy(userId);
    setError(null);
    try {
      await change();
      setPicked(null);
      setAdding(false);
    } catch (caught) {
      setError(isReauthError(caught) ? 'reauth' : 'failed');
    } finally {
      setBusy(null);
    }
  };

  const roleLabel = (user: ModUser) => (
    <span
      className={`font-bold text-[11px] uppercase tracking-[0.05em] ${user.role === 'owner' ? 'text-discord-yellow-light' : 'text-muted'}`}
    >
      {t(user.role === 'owner' ? 'chipOwner' : 'chipModerator')}
    </span>
  );

  return (
    <div className="flex flex-col gap-1">
      {error ? (
        <div className="mb-1">
          <ActionError mobile={mobile} reauth={error === 'reauth'} />
        </div>
      ) : null}
      <div
        className={
          mobile ? 'overflow-hidden rounded-3xl bg-background-darker' : ''
        }
      >
        {members.map((user) => (
          <StaffRow key={user.id} user={user} mobile={mobile}>
            {roleLabel(user)}
            {user.role === 'moderator' ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run(user.id, () => store.revoke(user.id))}
                aria-label={t('removeModerator', { name: user.displayName })}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-background-main hover:text-foreground disabled:opacity-40"
              >
                {busy === user.id ? <Spinner /> : <MdClose size={18} />}
              </button>
            ) : null}
          </StaffRow>
        ))}
      </div>
      <div className="my-1 h-px bg-line" />
      {adding ? (
        <div className="flex flex-col gap-1">
          <AccountPicker
            store={store}
            value={picked}
            onChange={setPicked}
            placeholder={t('addModeratorPlaceholder')}
            label={t('addModerator')}
          />
          <button
            type="button"
            disabled={busy !== null || !picked}
            onClick={() =>
              picked && run(picked, () => store.grant({ userId: picked }))
            }
            className={`${modButton('primary')} justify-center`}
          >
            {busy ? <Spinner /> : null}
            {t('addModerator')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-[38px] items-center gap-2.5 rounded-full px-3 text-left text-primary-light text-sm hover:bg-background-main"
        >
          <MdPersonAdd size={18} className="text-primary" />
          {t('addModerator')}
        </button>
      )}
    </div>
  );
};
