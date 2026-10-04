'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdClose, MdSearch } from 'react-icons/md';
import {
  ActionError,
  modButton,
  Spinner,
  useModFormat,
} from './ModerationParts';
import type { IpBlock, ObservedIp } from './types';
import { isReauthError, type ModerationStore } from './useModeration';

const field =
  'h-10 w-full rounded-full border border-white/[0.07] bg-background-darker px-3.5 text-foreground text-sm outline-none placeholder:text-subtle focus:border-white/[0.14]';

export const IpBlocksPanel = ({
  store,
  mobile = false,
}: {
  store: ModerationStore;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();
  const [bans, setBans] = useState<IpBlock[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [observed, setObserved] = useState<ObservedIp[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [manual, setManual] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'failed' | 'reauth' | null>(null);
  const { search, loadIpBlocks } = store;
  const candidates = results.flatMap((id) => {
    const user = store.usersById.get(id);
    return user && !user.role ? [user] : [];
  });
  const ips = [...picked, ...manual.split(/[\s,]+/).filter(Boolean)];

  useEffect(() => {
    loadIpBlocks()
      .then((result) => setBans(result.bans))
      .catch(() => setError('failed'));
  }, [loadIpBlocks]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || account) {
      setResults([]);
      return;
    }
    let current = true;
    const timer = setTimeout(() => {
      search(trimmed)
        .then((ids) => current && setResults(ids))
        .catch(() => current && setResults([]));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, account, search]);

  useEffect(() => {
    setObserved([]);
    if (!account) return;
    let current = true;
    loadIpBlocks(account)
      .then((result) => current && setObserved(result.observed))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [account, loadIpBlocks]);

  const clearAccount = () => {
    setAccount(null);
    setPicked([]);
    setQuery('');
  };

  const run = async (change: () => Promise<IpBlock[]>) => {
    setBusy(true);
    setError(null);
    try {
      setBans(await change());
      return true;
    } catch (caught) {
      setError(isReauthError(caught) ? 'reauth' : 'failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const choose = (userId: string, username: string) => {
    setAccount(userId);
    setQuery(username);
    setPicked([]);
  };

  const block = async () => {
    const done = await run(() =>
      store.blockIps({
        ips,
        userId: account ?? undefined,
        reason: reason.trim() || undefined,
      }),
    );
    if (done) {
      clearAccount();
      setManual('');
      setReason('');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <ActionError mobile={mobile} reauth={error === 'reauth'} />
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="px-1 font-semibold text-[13px] text-foreground">
          {t('ipBlocksTitle')}
        </p>
        {bans.length ? (
          bans.map((ban) => (
            <div
              key={ban.id}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px] text-foreground">
                  {ban.ip}
                </p>
                <p className="truncate text-[11.5px] text-subtle">
                  {date(ban.createdAt)}
                  {ban.reason ? ` · ${ban.reason}` : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => store.unblockIp(ban.id))}
                aria-label={t('unblockIp', { ip: ban.ip })}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-background-main hover:text-foreground disabled:opacity-40"
              >
                <MdClose size={18} />
              </button>
            </div>
          ))
        ) : (
          <p className="px-2 py-1 text-[13px] text-subtle">{t('noIpBlocks')}</p>
        )}
      </div>
      <div className="h-px bg-line" />
      <div className="flex flex-col gap-2">
        <p className="px-1 font-semibold text-[13px] text-foreground">
          {t('blockIpTitle')}
        </p>
        <label className="flex h-10 items-center gap-2 rounded-full border border-white/[0.07] bg-background-darker pr-3 pl-3.5 text-subtle focus-within:border-white/[0.14]">
          <MdSearch size={18} aria-hidden />
          <input
            type="search"
            value={query}
            readOnly={account !== null}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('ipAccountPlaceholder')}
            aria-label={t('ipAccountPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-subtle"
          />
          {account ? (
            <button
              type="button"
              onClick={clearAccount}
              aria-label={t('clearSearch')}
            >
              <MdClose size={18} />
            </button>
          ) : null}
        </label>
        {account
          ? null
          : candidates.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => choose(user.id, user.username)}
                className="rounded-xl px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-background-main"
              >
                {user.displayName}{' '}
                <span className="text-subtle">@{user.username}</span>
              </button>
            ))}
        {account ? (
          observed.length ? (
            <div className="flex flex-col gap-0.5">
              <p className="px-1 text-[11.5px] text-subtle">
                {t('observedIps')}
              </p>
              {observed.map((entry) => (
                <label
                  key={entry.ip}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-background-main"
                >
                  <input
                    type="checkbox"
                    checked={picked.includes(entry.ip)}
                    onChange={(event) =>
                      setPicked(
                        event.target.checked
                          ? [...picked, entry.ip]
                          : picked.filter((ip) => ip !== entry.ip),
                      )
                    }
                  />
                  <span className="flex-1 font-mono text-[13px] text-foreground">
                    {entry.ip}
                  </span>
                  <span className="text-[11.5px] text-subtle">
                    {date(entry.lastSeenAt)}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="px-2 text-[13px] text-subtle">{t('noObservedIps')}</p>
          )
        ) : null}
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder={t('ipManualPlaceholder')}
          aria-label={t('ipManualPlaceholder')}
          className={`${field} font-mono`}
        />
        <input
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t('ipReasonPlaceholder')}
          aria-label={t('ipReasonPlaceholder')}
          className={field}
        />
        <button
          type="button"
          disabled={busy || !ips.length}
          onClick={block}
          className={`${modButton('primary')} justify-center`}
        >
          {busy ? <Spinner /> : null}
          {t('blockIps', { count: ips.length })}
        </button>
      </div>
    </div>
  );
};
