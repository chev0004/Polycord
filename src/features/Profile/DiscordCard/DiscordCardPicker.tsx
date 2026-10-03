import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { MdLock } from 'react-icons/md';
import { FieldError, FormGroup, Label } from '@/components/Form';
import {
  type DiscordCardLayout,
  isPremiumDiscordCard,
  resolveDiscordCard,
} from '@/constants/discordCards';
import { DiscordPreview } from './DiscordPreview';
import { DISCORD_CARD_LAYOUTS } from './registry';
import { ScaledDiscordCard } from './ScaledDiscordCard';
import type { DiscordCardData, DiscordCardLayoutDefinition } from './types';

const thumbnailClass = (selected: boolean) => {
  const outline = selected
    ? 'outline-white'
    : 'outline-transparent group-hover:outline-line-strong';

  return `relative block rounded-lg outline outline-2 outline-offset-[3px] transition-[outline-color] duration-150 ${outline}`;
};

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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-3 gap-y-3.5">
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
            className="group flex flex-col gap-1.5 text-left focus:outline-none"
          >
            <span className={thumbnailClass(selected)}>
              <span
                aria-hidden="true"
                className="block overflow-hidden rounded-lg"
              >
                <ScaledDiscordCard layout={layout} data={data} vars={vars} />
              </span>
              {locked && !selected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg bg-background-dark/55 transition-colors duration-150 group-hover:bg-background-dark/20"
                />
              ) : null}
              {locked ? (
                <span className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-foreground">
                  <MdLock size={14} />
                </span>
              ) : null}
            </span>
            <span
              className={`font-medium text-[12px] ${selected ? 'text-foreground' : 'text-soft'}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const DiscordCardPicker = ({
  value,
  onChange,
  premium,
  tease,
  onTease,
  data,
  vars,
  error,
  layouts = DISCORD_CARD_LAYOUTS,
}: {
  value: DiscordCardLayout;
  onChange: (id: DiscordCardLayout) => void;
  premium: boolean;
  tease: DiscordCardLayout | null;
  onTease: (id: DiscordCardLayout | null) => void;
  data: DiscordCardData;
  vars: CSSProperties;
  error?: string;
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
      <FormGroup>
        <Label>{t('discordCardPreviewLabel')}</Label>
        <DiscordPreview layout={current} data={data} vars={vars} />
      </FormGroup>
      <FormGroup>
        <Label>{t('discordCardFreeLabel')}</Label>
        <LayoutGrid
          layouts={free}
          locked={false}
          shown={shown}
          data={data}
          vars={vars}
          onSelect={select}
        />
      </FormGroup>
      {paid.length ? (
        <FormGroup>
          <Label>{t('discordCardPremiumLabel')}</Label>
          <LayoutGrid
            layouts={paid}
            locked={!premium}
            shown={shown}
            data={data}
            vars={vars}
            onSelect={choosePremium}
          />
        </FormGroup>
      ) : null}
      <p className="text-[12px] text-subtle">
        {premium ? t('discordCardHintPremium') : t('discordCardHintFree')}
      </p>
      {!premium && tease ? (
        <p className="text-[13px] text-muted leading-relaxed">
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
                className="font-semibold text-primary-light focus:outline-none focus-visible:text-primary-lighter"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : null}
      {error ? <FieldError id="discordCard-error">{error}</FieldError> : null}
    </>
  );
};
