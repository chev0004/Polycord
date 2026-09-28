'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdWorkspacePremium } from 'react-icons/md';
import {
  GRANT_MAX,
  GRANT_UNITS,
  type GrantUnit,
  grantExpiry,
  isValidGrant,
} from '@/lib/premiumGrant';
import {
  ActionError,
  durationTile,
  modButton,
  Spinner,
  SuspendEnds,
  useModFormat,
} from './ModerationParts';
import type { ModUser } from './types';
import { isReauthError, type ModerationStore } from './useModeration';

export const PremiumPanel = ({
  store,
  user,
  mobile = false,
}: {
  store: ModerationStore;
  user: ModUser;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { date, time } = useModFormat();
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<GrantUnit>('months');
  const [busy, setBusy] = useState<'grant' | 'revoke' | null>(null);
  const [error, setError] = useState<'failed' | 'reauth' | null>(null);
  const { grantedUntil, subscriptionUntil, configured } = user.premium;
  const granted =
    grantedUntil !== undefined && new Date(grantedUntil).getTime() > Date.now();
  const otherSources = [
    subscriptionUntil
      ? t('premiumPaidUntil', { date: date(subscriptionUntil) })
      : null,
    configured ? t('premiumConfigured') : null,
  ].filter((source) => source !== null);
  const valid = isValidGrant(Number(amount), unit);
  const until = valid ? grantExpiry(new Date(), Number(amount), unit) : null;
  const button = (tone: 'primary' | 'danger') =>
    `${modButton(tone)} justify-center ${mobile ? 'h-11 rounded-full px-4 text-sm' : ''}`;

  const run = async (kind: 'grant' | 'revoke', change: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await change();
    } catch (caught) {
      setError(isReauthError(caught) ? 'reauth' : 'failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 ${mobile ? 'rounded-[20px] bg-background-dark p-4' : ''}`}
    >
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-3 rounded-[14px] bg-background-darker px-3.5 py-3"
      >
        <MdWorkspacePremium
          size={20}
          aria-hidden
          className={granted ? 'text-discord-yellow' : 'text-subtle'}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] text-soft">
          <span>
            {granted
              ? t.rich('premiumGrantActive', {
                  date: date(grantedUntil),
                  time: time(new Date(grantedUntil)),
                  b: (chunks) => (
                    <b className="font-semibold text-foreground">{chunks}</b>
                  ),
                })
              : t('premiumNoGrant')}
          </span>
          {otherSources.map((source) => (
            <span key={source} className="text-muted text-xs">
              {source}
            </span>
          ))}
          {granted && otherSources.length ? (
            <span className="text-discord-yellow-light text-xs">
              {t('premiumStaysActive')}
            </span>
          ) : null}
        </div>
        {granted ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run('revoke', () => store.revokePremium(user.id))}
            className={`${button('danger')} ${mobile ? 'w-full' : ''}`}
          >
            {busy === 'revoke' ? <Spinner /> : null}
            {t('revokePremium')}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-[13px] text-soft">
          {t('premiumDuration')}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={GRANT_MAX[unit]}
            value={amount}
            aria-label={t('premiumAmount')}
            aria-invalid={!valid}
            onChange={(event) => setAmount(event.target.value)}
            className={`w-20 rounded-lg border bg-background-darker px-3 text-foreground text-sm outline-none ${mobile ? 'h-11' : 'h-[38px]'} ${valid ? 'border-white/[0.07] hover:border-white/[0.14] focus:border-white/[0.14]' : 'border-red-500'}`}
          />
          {GRANT_UNITS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={unit === value}
              onClick={() => setUnit(value)}
              className={`${durationTile(unit === value)} flex-1 px-3 ${mobile ? 'h-11' : ''}`}
            >
              {t(`unit_${value}`)}
            </button>
          ))}
        </div>
        {until ? (
          <>
            <span className="text-[12.5px] text-muted">
              <SuspendEnds until={until} />
            </span>
            {granted ? (
              <span className="text-[12.5px] text-muted">
                {t('premiumReplaces', { date: date(grantedUntil) })}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-[12.5px] text-red-500">
            {t('premiumAmountInvalid', { max: GRANT_MAX[unit] })}
          </span>
        )}
      </div>
      {error ? (
        <ActionError mobile={mobile} reauth={error === 'reauth'} />
      ) : null}
      <button
        type="button"
        disabled={!valid || busy !== null}
        onClick={() =>
          run('grant', () => store.grantPremium(user.id, Number(amount), unit))
        }
        className={`${button('primary')} self-start ${mobile ? 'w-full' : ''}`}
      >
        {busy === 'grant' ? <Spinner /> : null}
        {t(granted ? 'replacePremium' : 'grantPremium')}
      </button>
    </div>
  );
};
