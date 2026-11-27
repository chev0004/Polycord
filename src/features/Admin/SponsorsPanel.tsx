'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import {
  SPONSOR_IMAGE_SIZES,
  SPONSOR_IMAGE_TYPES,
  SPONSOR_LIMITS,
  SPONSOR_TIERS,
  type SponsorImageSlot,
  type SponsorTier,
} from '@/constants/sponsors';
import {
  ActionError,
  durationTile,
  modButton,
  modField,
  Spinner,
  useModFormat,
} from './ModerationParts';

export type AdminSponsor = {
  id: string;
  tier: SponsorTier;
  name: string;
  url: string;
  startsAt: string;
  endsAt: string;
  paused: boolean;
  views: number;
  clicks: number;
};

type Failure = 'invalid' | 'booked' | 'failed' | 'reauth';

const DAY_MS = 86_400_000;

const failureOf = (status: number): Failure =>
  status === 401
    ? 'reauth'
    : status === 409
      ? 'booked'
      : status === 400
        ? 'invalid'
        : 'failed';

const request = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  if (!response.ok) throw failureOf(response.status);
  return response.status === 204 ? null : response.json();
};

const statusOf = (sponsor: AdminSponsor, now: number) =>
  sponsor.paused
    ? 'Paused'
    : now < Date.parse(sponsor.startsAt)
      ? 'Scheduled'
      : now >= Date.parse(sponsor.endsAt)
        ? 'Ended'
        : 'Live';

const statusTone = {
  Live: 'bg-primary-darker text-primary-light',
  Scheduled: 'bg-background-darker text-soft',
  Paused: 'bg-[rgba(161,98,7,0.25)] text-discord-yellow',
  Ended: 'bg-background-darker text-subtle',
};

const ImageField = ({
  slot,
  label,
  onChange,
}: {
  slot: SponsorImageSlot;
  label: string;
  onChange: (file: File | null) => void;
}) => {
  const t = useTranslations('Admin');
  const { width, height } = SPONSOR_IMAGE_SIZES[slot];
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
        {label}
      </span>
      <input
        type="file"
        required
        accept={SPONSOR_IMAGE_TYPES.join(',')}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="text-[13px] text-muted file:mr-3 file:h-[34px] file:cursor-pointer file:rounded-lg file:border file:border-[rgba(107,114,128,0.5)] file:border-solid file:bg-background-darker file:px-3 file:text-[13px] file:text-foreground"
      />
      <span className="text-[12px] text-subtle">
        {t('sponsorImageHint', { width, height })}
      </span>
    </label>
  );
};

const TextField = ({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="flex flex-col gap-1.5">
    <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
      {label}
    </span>
    <input required className={`${modField} [color-scheme:dark]`} {...props} />
  </label>
);

const SponsorForm = ({
  onAdded,
  mobile,
}: {
  onAdded: (sponsor: AdminSponsor) => void;
  mobile: boolean;
}) => {
  const t = useTranslations('Admin');
  const [tier, setTier] = useState<SponsorTier>('card');
  const [images, setImages] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const start = new Date(`${data.get('start')}T00:00`);
    const end = new Date(`${data.get('end')}T00:00`);
    data.set('tier', tier);
    data.set('startsAt', start.toISOString());
    data.set('endsAt', new Date(end.getTime() + DAY_MS).toISOString());
    for (const [key, file] of Object.entries(images))
      if (file) data.set(key, file);
    setBusy(true);
    setFailure(null);
    try {
      const { sponsor } = await request('/api/admin/sponsors', {
        method: 'POST',
        body: data,
      });
      onAdded(sponsor);
      form.reset();
      setImages({});
    } catch (caught) {
      setFailure(caught as Failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h3 className="font-bold text-base text-foreground">
        {t('sponsorAddTitle')}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {SPONSOR_TIERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tier === option}
            onClick={() => setTier(option)}
            className={durationTile(tier === option)}
          >
            {t(option === 'card' ? 'sponsorTierCard' : 'sponsorTierBanner')}
          </button>
        ))}
      </div>
      <div className={`grid gap-3 ${mobile ? '' : 'grid-cols-2'}`}>
        <TextField name="name" maxLength={80} label={t('sponsorName')} />
        <TextField
          name="url"
          type="url"
          pattern="https://.*"
          label={t('sponsorUrl')}
        />
        <TextField name="altEn" maxLength={200} label={t('sponsorAltEn')} />
        <TextField name="altJa" maxLength={200} label={t('sponsorAltJa')} />
        <TextField name="start" type="date" label={t('sponsorStart')} />
        <TextField name="end" type="date" label={t('sponsorEnd')} />
        <ImageField
          key={`${tier}-image`}
          slot={tier}
          label={t(tier === 'card' ? 'sponsorCardImage' : 'sponsorWideImage')}
          onChange={(file) =>
            setImages((current) => ({ ...current, image: file }))
          }
        />
        {tier === 'banner' ? (
          <ImageField
            slot="phone"
            label={t('sponsorPhoneImage')}
            onChange={(file) =>
              setImages((current) => ({ ...current, phoneImage: file }))
            }
          />
        ) : null}
      </div>
      {failure === 'invalid' || failure === 'booked' ? (
        <p role="alert" className="text-[13px] text-red-400">
          {t(failure === 'invalid' ? 'sponsorInvalid' : 'sponsorBooked')}
        </p>
      ) : failure ? (
        <ActionError mobile={mobile} reauth={failure === 'reauth'} />
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className={`${modButton('primary')} self-start`}
      >
        {busy ? <Spinner /> : null}
        {t('sponsorAdd')}
      </button>
    </form>
  );
};

export const SponsorsPanel = ({
  initial,
  mobile = false,
}: {
  initial?: AdminSponsor[];
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const number = new Intl.NumberFormat(useLocale());
  const { date } = useModFormat();
  const [sponsors, setSponsors] = useState(initial);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const now = Date.now();

  useEffect(() => {
    if (initial) return;
    request('/api/admin/sponsors')
      .then((result) => setSponsors(result.sponsors))
      .catch(() => setFailure('failed'));
  }, [initial]);

  const change = async (sponsor: AdminSponsor, method: 'PATCH' | 'DELETE') => {
    setBusy(sponsor.id);
    setFailure(null);
    try {
      const result = await request(`/api/admin/sponsors/${sponsor.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:
          method === 'PATCH'
            ? JSON.stringify({ paused: !sponsor.paused })
            : undefined,
      });
      setSponsors((current) =>
        result
          ? current?.map((row) =>
              row.id === sponsor.id ? result.sponsor : row,
            )
          : current?.filter((row) => row.id !== sponsor.id),
      );
    } catch (caught) {
      setFailure(caught as Failure);
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  return (
    <section
      aria-label={t('sponsorsTitle')}
      className={`flex flex-col gap-6 bg-background-dark ${mobile ? 'mx-4 rounded-3xl p-[18px]' : 'max-w-[880px] rounded-3xl p-6 shadow-xl'}`}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-bold text-foreground text-lg">
          {t('sponsorsTitle')}
        </h2>
        <p className="text-[13.5px] text-muted leading-normal">
          {t('sponsorsIntro')}
        </p>
      </div>

      {failure === 'failed' || failure === 'reauth' ? (
        <ActionError mobile={mobile} reauth={failure === 'reauth'} />
      ) : null}

      {SPONSOR_TIERS.map((tier) => {
        const rows = sponsors?.filter((sponsor) => sponsor.tier === tier);
        return (
          <div key={tier} className="flex flex-col gap-2">
            <h3 className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
              {t(
                tier === 'card'
                  ? 'sponsorCardsHeading'
                  : 'sponsorBannerHeading',
                {
                  count: SPONSOR_LIMITS[tier],
                },
              )}
            </h3>
            {rows === undefined ? (
              <Spinner className="h-4 w-4 text-muted" />
            ) : rows.length ? (
              rows.map((sponsor) => {
                const status = statusOf(sponsor, now);
                return (
                  <div
                    key={sponsor.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-background-darker p-4"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground text-sm">
                          {sponsor.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold text-[11px] ${statusTone[status]}`}
                        >
                          {t(`sponsorStatus${status}`)}
                        </span>
                      </p>
                      <p className="truncate text-[12.5px] text-subtle">
                        {t('sponsorDates', {
                          start: date(sponsor.startsAt),
                          end: date(new Date(Date.parse(sponsor.endsAt) - 1)),
                        })}
                      </p>
                      <p className="text-[12.5px] text-soft tabular-nums">
                        {t('sponsorStats', {
                          views: number.format(sponsor.views),
                          clicks: number.format(sponsor.clicks),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {confirming === sponsor.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className={modButton()}
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={busy === sponsor.id}
                            onClick={() => change(sponsor, 'DELETE')}
                            className={modButton('dangerFill')}
                          >
                            {busy === sponsor.id ? <Spinner /> : null}
                            {t('sponsorRemoveConfirm')}
                          </button>
                        </>
                      ) : (
                        <>
                          {status === 'Ended' ? null : (
                            <button
                              type="button"
                              disabled={busy === sponsor.id}
                              onClick={() => change(sponsor, 'PATCH')}
                              className={modButton()}
                            >
                              {busy === sponsor.id ? <Spinner /> : null}
                              {t(
                                sponsor.paused
                                  ? 'sponsorResume'
                                  : 'sponsorPause',
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirming(sponsor.id)}
                            className={modButton('danger')}
                          >
                            {t('sponsorRemove')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[13px] text-subtle">{t('sponsorNone')}</p>
            )}
          </div>
        );
      })}

      <div className="h-px bg-line" />

      <SponsorForm
        mobile={mobile}
        onAdded={(sponsor) =>
          setSponsors((current) => [sponsor, ...(current ?? [])])
        }
      />
    </section>
  );
};
