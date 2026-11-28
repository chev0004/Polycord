'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { countryOptions } from '@/constants/countries';
import { getLanguageName } from '@/constants/languages';
import {
  SPONSOR_BOOKING_DAYS,
  SPONSOR_IMAGE_SIZES,
  SPONSOR_LIMITS,
  SPONSOR_PRICES_USD,
  type SponsorTier,
} from '@/constants/sponsors';
import type { AudienceGroup, AudienceTotals } from '@/db/audience';

const IMAGE_RULES = ['imageRule1', 'imageRule2', 'imageRule3', 'imageRule4'];
const CONTENT_RULES = ['contentRule1', 'contentRule2', 'contentRule3'];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="mt-12 flex flex-col gap-4">
    <h2 className="font-bold text-2xl text-foreground">{title}</h2>
    {children}
  </section>
);

const Rules = ({ title, keys }: { title: string; keys: string[] }) => {
  const t = useTranslations('Advertise');
  return (
    <div className="rounded-panel border border-primary-darker bg-background-darker p-5">
      <h3 className="font-bold text-foreground text-lg">{title}</h3>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[15px] text-muted leading-relaxed">
        {keys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </div>
  );
};

const Groups = ({
  title,
  groups,
  name,
}: {
  title: string;
  groups: AudienceGroup[];
  name: (code: string) => string;
}) => {
  const t = useTranslations('Advertise');
  return groups.length ? (
    <div className="rounded-panel border border-primary-darker bg-background-darker p-5">
      <h3 className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
        {title}
      </h3>
      <ol className="mt-3 flex flex-col gap-3">
        {groups.map(({ code, share }) => (
          <li key={code} className="flex flex-col gap-1.5">
            <span className="flex justify-between gap-3 text-[15px]">
              <span className="text-foreground">{name(code)}</span>
              <span className="text-muted tabular-nums">
                {t('share', { share })}
              </span>
            </span>
            <span className="block h-1.5 rounded-full bg-background-dark">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${share}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </div>
  ) : null;
};

const Preview = ({ tier }: { tier: SponsorTier }) => (
  <div
    aria-hidden
    className="flex flex-col gap-2 rounded-2xl bg-background-main p-3"
  >
    {tier === 'banner' ? (
      <span className="block aspect-[8/1] rounded-md bg-primary" />
    ) : null}
    <span className="grid grid-cols-3 items-start gap-2">
      {[0, 1, 2, 3, 4, 5].map((slot) => (
        <span
          key={slot}
          className={`block aspect-[4/5] rounded-md ${
            tier === 'card' && slot === 4 ? 'bg-primary' : 'bg-background-dark'
          }`}
        />
      ))}
    </span>
  </div>
);

const Placement = ({ tier }: { tier: SponsorTier }) => {
  const t = useTranslations('Advertise');
  const price = new Intl.NumberFormat(useLocale(), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(SPONSOR_PRICES_USD[tier]);
  const { banner, phone, card } = SPONSOR_IMAGE_SIZES;
  return (
    <div className="flex flex-col gap-4 rounded-panel border border-primary-darker bg-background-darker p-5">
      <Preview tier={tier} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-bold text-foreground text-xl">
          {t(tier === 'card' ? 'cardTitle' : 'bannerTitle')}
        </h3>
        <p className="font-semibold text-primary-light">
          {t('price', { price, days: SPONSOR_BOOKING_DAYS })}
        </p>
      </div>
      <p className="text-[15px] text-muted leading-relaxed">
        {tier === 'card'
          ? t('cardDescription', { limit: SPONSOR_LIMITS.card })
          : t('bannerDescription')}
      </p>
      <p className="text-sm text-soft">
        {tier === 'card'
          ? t('cardImage', card)
          : t('bannerImage', {
              wideWidth: banner.width,
              wideHeight: banner.height,
              phoneWidth: phone.width,
              phoneHeight: phone.height,
            })}
      </p>
    </div>
  );
};

export const AdvertisePage = ({
  audience,
  minGroup,
  inviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL,
}: {
  audience: AudienceTotals | null;
  minGroup: number;
  inviteUrl?: string;
}) => {
  const t = useTranslations('Advertise');
  const locale = useLocale();
  const countries = new Map(
    countryOptions(locale).map(({ value, label }) => [value, label]),
  );
  const language = (code: string) => getLanguageName(code, locale);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 font-figtree sm:px-8">
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 font-black text-3xl text-foreground tracking-[-0.01em] sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-muted leading-relaxed">
          {t('intro')}
        </p>

        <Section title={t('audienceTitle')}>
          {audience ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['profilesLabel', audience.profiles],
                    ['activeLabel', audience.active],
                  ] as const
                )
                  .filter(([, count]) => count > 0)
                  .map(([label, count]) => (
                    <div
                      key={label}
                      className="rounded-panel border border-primary-darker bg-background-darker p-5"
                    >
                      <dt className="text-muted text-sm">{t(label)}</dt>
                      <dd className="mt-1 font-black text-4xl text-foreground tabular-nums">
                        {t('count', { count })}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div className="grid gap-4 md:grid-cols-3">
                <Groups
                  title={t('speakTitle')}
                  groups={audience.speak}
                  name={language}
                />
                <Groups
                  title={t('learnTitle')}
                  groups={audience.learn}
                  name={language}
                />
                <Groups
                  title={t('countriesTitle')}
                  groups={audience.countries}
                  name={(code) => countries.get(code) ?? code}
                />
              </div>
              <p className="text-sm text-subtle leading-relaxed">
                {t('audienceNote', { min: minGroup })}
              </p>
            </>
          ) : (
            <p className="text-[15px] text-muted leading-relaxed">
              {t('audienceEmpty')}
            </p>
          )}
        </Section>

        <Section title={t('placementsTitle')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Placement tier="card" />
            <Placement tier="banner" />
          </div>
        </Section>

        <Section title={t('rulesTitle')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Rules title={t('imageRulesTitle')} keys={IMAGE_RULES} />
            <Rules title={t('contentRulesTitle')} keys={CONTENT_RULES} />
          </div>
        </Section>

        <Section title={t('reportingTitle')}>
          <p className="max-w-2xl text-[15px] text-muted leading-relaxed">
            {t('reporting')}
          </p>
        </Section>

        <Section title={t('contactTitle')}>
          <p className="max-w-2xl text-[15px] text-muted leading-relaxed">
            {t('contact')}
          </p>
          {inviteUrl ? (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-2 rounded-control bg-discord-blue px-4 py-2.5 font-semibold text-sm text-white transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98] max-sm:min-h-11"
            >
              <FaDiscord size={18} className="shrink-0" />
              {t('contactButton')}
            </a>
          ) : null}
        </Section>
      </div>
    </main>
  );
};
