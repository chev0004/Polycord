'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { AccountPicker } from './AccountPicker';
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
  const [account, setAccount] = useState<string | null>(null);
  const [observed, setObserved] = useState<ObservedIp[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [manual, setManual] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'failed' | 'reauth' | null>(null);
  const { loadIpBlocks } = store;
  const ips = [...picked, ...manual.split(/[\s,]+/).filter(Boolean)];

  useEffect(() => {
    loadIpBlocks()
      .then((result) => setBans(result.bans))
      .catch(() => setError('failed'));
  }, [loadIpBlocks]);

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

  const chooseAccount = (userId: string | null) => {
    setAccount(userId);
    setPicked([]);
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

  const block = async () => {
    const done = await run(() =>
      store.blockIps({
        ips,
        userId: account ?? undefined,
        reason: reason.trim() || undefined,
      }),
    );
    if (done) {
      chooseAccount(null);
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
        <AccountPicker
          store={store}
          value={account}
          onChange={chooseAccount}
          placeholder={t('ipAccountPlaceholder')}
          label={t('ipAccountPlaceholder')}
        />
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
