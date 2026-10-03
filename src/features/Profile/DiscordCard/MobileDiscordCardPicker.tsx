import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { MdCheck, MdLock } from 'react-icons/md';
import {
  type DiscordCardLayout,
  isPremiumDiscordCard,
  resolveDiscordCard,
} from '@/constants/discordCards';
import { DiscordPreview } from './DiscordPreview';
import { DISCORD_CARD_LAYOUTS } from './registry';
import { ScaledDiscordCard } from './ScaledDiscordCard';
import type { DiscordCardData, DiscordCardLayoutDefinition } from './types';

const groupLabel =
  'flex items-center justify-between px-1 pt-5 pb-2 font-semibold text-subtle text-xs uppercase tracking-[0.06em]';

const premiumTag =
  'rounded bg-primary-darker px-1.5 py-0.5 font-bold text-[10px] text-primary-light uppercase tracking-[0.04em]';

const LayoutGrid = ({
  layouts,
  locked,
  shown,
  data,
  vars,
  onSelect,
}: {
  layouts: DiscordCardLayoutDefinition[];
  locked: boolean;
  shown: DiscordCardLayout;
  data: DiscordCardData;
  vars: CSSProperties;
  onSelect: (id: DiscordCardLayout) => void;
}) => {
  const t = useTranslations('Profile');
  const tCard = useTranslations('DiscordCard');

  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-[18px] px-1">
      {layouts.map((layout) => {
        const label = tCard(layout.labelKey);
        const selected = shown === layout.id;

        return (
          <button
            key={layout.id}
            type="button"
            aria-label={
              locked ? t('discordCardLockedLayout', { layout: label }) : label
            }
            aria-pressed={selected}
            onClick={() => onSelect(layout.id)}
            className={`flex min-w-0 flex-col gap-2 text-left font-medium text-[13px] ${selected ? 'text-foreground' : 'text-soft'}`}
          >
            <span
              className={`relative block rounded-[10px] outline outline-2 outline-offset-[3px] transition-[outline-color,opacity] duration-150 ${
                selected
                  ? locked
                    ? 'outline-line-strong'
                    : 'outline-primary'
                  : `outline-transparent ${locked ? 'opacity-50' : ''}`
              }`}
            >
              <span
                aria-hidden="true"
                className="block overflow-hidden rounded-[10px]"
              >
                <ScaledDiscordCard layout={layout} data={data} vars={vars} />
              </span>
              {locked ? (
                <span className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-foreground">
                  <MdLock size={16} aria-hidden />
                </span>
              ) : selected ? (
                <span className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-on-primary">
                  <MdCheck size={16} aria-hidden />
                </span>
              ) : null}
            </span>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const MobileDiscordCardPicker = ({
  value,
  onChange,
  premium,
  tease,
  onTease,
  data,
  vars,
  layouts = DISCORD_CARD_LAYOUTS,
}: {
  value: DiscordCardLayout;
  onChange: (id: DiscordCardLayout) => void;
  premium: boolean;
  tease: DiscordCardLayout | null;
  onTease: (id: DiscordCardLayout | null) => void;
  data: DiscordCardData;
  vars: CSSProperties;
  layouts?: DiscordCardLayoutDefinition[];
}) => {
  const t = useTranslations('Profile');
  const tCard = useTranslations('DiscordCard');
  const locale = useLocale();
  const shown = tease ?? resolveDiscordCard(value, premium);
  const current = layouts.find((layout) => layout.id === shown) ?? layouts[0];
  const free = layouts.filter((layout) => !isPremiumDiscordCard(layout.id));
  const paid = layouts.filter((layout) => isPremiumDiscordCard(layout.id));

  const select = (id: DiscordCardLayout) => {
    onTease(null);
    onChange(id);
  };
  const choosePremium = (id: DiscordCardLayout) =>
    premium ? select(id) : onTease(tease === id ? null : id);

  return (
    <>
      <div className="-mx-5 -mt-1 -top-1 sticky z-[3] bg-background-dark px-5 pt-2 pb-3">
        <div className={`${groupLabel} !pt-0`}>
          {t('discordCardPreviewLabel')}
        </div>
        <DiscordPreview layout={current} data={data} vars={vars} />
        {!premium && tease ? (
          <p className="mt-2.5 rounded-lg bg-primary-darker px-3.5 py-3 text-[13px] text-soft leading-normal">
            {t.rich('discordCardTeaseUpsell', {
              layout: tCard(current.labelKey),
              strong: (chunks) => (
                <strong className="font-semibold text-foreground">
                  {chunks}
                </strong>
              ),
              premiumLink: (chunks) => (
                <Link
                  href={`/${locale}/settings#supporter`}
                  className="font-bold text-primary-light"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        ) : null}
      </div>
      <div className={groupLabel}>
        {t('discordCardFreeLabel')}
        <span className="font-medium normal-case tracking-normal">
          {free.length}
        </span>
      </div>
      <LayoutGrid
        layouts={free}
        locked={false}
        shown={shown}
        data={data}
        vars={vars}
        onSelect={select}
      />
      {paid.length ? (
        <>
          <div className={groupLabel}>
            {t('discordCardPremiumLabel')}
            {premium ? null : (
              <span className={premiumTag}>{t('discordCardPremiumLabel')}</span>
            )}
          </div>
          <LayoutGrid
            layouts={paid}
            locked={!premium}
            shown={shown}
            data={data}
            vars={vars}
            onSelect={choosePremium}
          />
        </>
      ) : null}
      <p className="mt-3.5 text-[13px] text-subtle leading-snug">
        {premium ? t('discordCardHintPremium') : t('discordCardHintFree')}
      </p>
    </>
  );
};
