'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdWorkspacePremium } from 'react-icons/md';
import { NumberStepper } from '@/components/Form';
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
  hasGrant,
  modButton,
  Spinner,
  SuspendEnds,
  useModFormat,
} from './ModerationParts';
import type { ModUser } from './types';
import { isReauthError, type ModerationStore } from './useModeration';

export const useGrant = (
  store: ModerationStore,
  user: ModUser,
  onDone?: () => void,
) => {
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<GrantUnit>('months');
  const [busy, setBusy] = useState<'grant' | 'revoke' | null>(null);
  const [error, setError] = useState<'failed' | 'reauth' | null>(null);
  const { grantedUntil } = user.premium;
  const granted = hasGrant(user);
  const valid = isValidGrant(Number(amount), unit);
  const until = valid
    ? grantExpiry(
        granted && grantedUntil ? new Date(grantedUntil) : new Date(),
        Number(amount),
        unit,
      )
    : null;

  const run = async (kind: 'grant' | 'revoke', change: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await change();
      onDone?.();
    } catch (caught) {
      setError(isReauthError(caught) ? 'reauth' : 'failed');
    } finally {
      setBusy(null);
    }
  };

  return {
    amount,
    setAmount,
    unit,
    setUnit,
    busy,
    error,
    clearError: () => setError(null),
    granted,
    valid,
    until,
    grant: () =>
      run('grant', () => store.grantPremium(user.id, Number(amount), unit)),
    revoke: () => run('revoke', () => store.revokePremium(user.id)),
  };
};

export const GrantFields = ({
  grant,
  mobile = false,
}: {
  grant: ReturnType<typeof useGrant>;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const { amount, unit, valid, until, granted } = grant;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-[13px] text-soft">
        {t(granted ? 'premiumExtendBy' : 'premiumDuration')}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <NumberStepper
          value={amount}
          onChange={grant.setAmount}
          min={1}
          max={GRANT_MAX[unit]}
          size={mobile ? 'lg' : 'md'}
          label={t('premiumAmount')}
          decrementLabel={t('decrease')}
          incrementLabel={t('increase')}
          error={!valid}
          className="w-36"
        />
        {GRANT_UNITS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={unit === value}
            onClick={() => grant.setUnit(value)}
            className={`${durationTile(unit === value)} flex-1 px-3 ${mobile ? 'h-11' : ''}`}
          >
            {t(`unit_${value}`)}
          </button>
        ))}
      </div>
      {until ? (
        <span className="text-[12.5px] text-muted">
          <SuspendEnds until={until} />
        </span>
      ) : (
        <span className="text-[12.5px] text-red-500">
          {t('premiumAmountInvalid', { max: GRANT_MAX[unit] })}
        </span>
      )}
      {grant.error ? (
        <ActionError mobile={mobile} reauth={grant.error === 'reauth'} />
      ) : null}
    </div>
  );
};

export const PremiumPanel = ({
  store,
  user,
}: {
  store: ModerationStore;
  user: ModUser;
}) => {
  const t = useTranslations('Admin');
  const { date, time } = useModFormat();
  const grant = useGrant(store, user);
  const { grantedUntil, subscriptionUntil, configured } = user.premium;
  const { granted, busy } = grant;
  const otherSources = [
    subscriptionUntil
      ? t('premiumPaidUntil', { date: date(subscriptionUntil) })
      : null,
    configured ? t('premiumConfigured') : null,
  ].filter((source) => source !== null);

  return (
    <div className="flex flex-col gap-3">
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
            {granted && grantedUntil
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
            onClick={grant.revoke}
            className={`${modButton('danger')} justify-center`}
          >
            {busy === 'revoke' ? <Spinner /> : null}
            {t('revokePremium')}
          </button>
        ) : null}
      </div>
      <GrantFields grant={grant} />
      <button
        type="button"
        disabled={!grant.valid || busy !== null}
        onClick={grant.grant}
        className={`${modButton('primary')} justify-center self-start`}
      >
        {busy === 'grant' ? <Spinner /> : null}
        {t(granted ? 'replacePremium' : 'grantPremium')}
      </button>
    </div>
  );
};
