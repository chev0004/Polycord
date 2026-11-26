'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import {
  ActionError,
  modButton,
  modField,
  Spinner,
  useModFormat,
} from './ModerationParts';
import type { BanReferenceMatch } from './types';
import type { ModerationStore } from './useModeration';

export const BanReferencePanel = ({
  store,
  mobile = false,
}: {
  store: ModerationStore;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const [reference, setReference] = useState('');
  const [ban, setBan] = useState<BanReferenceMatch | null>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const lookUp = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      setBan(await store.lookupBanReference(reference));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={lookUp} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="px-1 font-semibold text-[13px] text-foreground">
          {t('banReferenceLabel')}
        </span>
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder={t('banReferencePlaceholder')}
          autoComplete="off"
          spellCheck={false}
          className={`${modField} font-mono uppercase`}
        />
      </label>
      <button
        type="submit"
        disabled={busy || !reference.trim()}
        className={`${modButton('primary')} justify-center`}
      >
        {busy ? <Spinner /> : null}
        {t('banReferenceLookup')}
      </button>
      {failed ? <ActionError mobile={mobile} /> : null}
      {ban === null ? (
        <p className="px-1 text-[13px] text-muted">
          {t('banReferenceNotFound')}
        </p>
      ) : null}
      {ban ? (
        <div className="flex flex-col gap-2 rounded-xl bg-background-darker p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold text-[13px] text-foreground">
              {t(ban.kind === 'ip' ? 'banReferenceIp' : 'banReferenceAccount')}
            </p>
            <p className="text-[12px] text-subtle">{date(ban.bannedAt)}</p>
          </div>
          {ban.revokedAt ? (
            <p className="text-[12.5px] text-muted">
              {t('banReferenceLifted', { date: date(ban.revokedAt) })}
            </p>
          ) : null}
          {ban.note ? (
            <p className="text-[13px] text-soft">{ban.note}</p>
          ) : null}
          {ban.user ? (
            <div className="flex items-center gap-2.5">
              <Avatar avatarUrl={ban.user.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-[13px] text-foreground">
                  {ban.user.displayName}
                </p>
                <p className="truncate text-[12px] text-subtle">
                  @{ban.user.username}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-muted">
              {ban.discordUserId
                ? t('banReferenceDiscordId', { id: ban.discordUserId })
                : t('banReferenceNoAccount')}
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
};
