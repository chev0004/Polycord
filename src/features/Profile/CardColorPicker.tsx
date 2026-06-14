'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { FormGroup, Label } from '@/components/Form';
import {
  FREE_CARD_COLORS,
  PREMIUM_CARD_THEMES,
} from '@/features/Discovery/cardTheme';

const COLOR_LABEL_KEYS: Record<string, string> = {
  sky: 'cardColorSky',
  pink: 'cardColorPink',
  slate: 'cardColorSlate',
  indigo: 'cardColorIndigo',
  gold: 'cardColorGold',
  dusk: 'cardColorDusk',
  rose: 'cardColorRose',
  blue: 'cardColorBlue',
};

const SELECTED_RING =
  '0 0 0 3px var(--color-background-dark), 0 0 0 5px #ffffff';
const TEASE_RING =
  '0 0 0 3px var(--color-background-dark), 0 0 0 5px rgba(255,255,255,0.45)';

const swatchClasses =
  'h-[34px] w-[34px] shrink-0 rounded-full transition-[box-shadow,opacity] duration-150 focus:outline-none';

type CardColorPickerProps = {
  value: string;
  onChange: (id: string) => void;
  premium?: boolean;
  tease: string | null;
  onTease: (id: string | null) => void;
};

export const CardColorPicker = ({
  value,
  onChange,
  premium = false,
  tease,
  onTease,
}: CardColorPickerProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();

  return (
    <FormGroup>
      <Label>{t('bannerColourLabel')}</Label>
      <div className="flex flex-wrap items-center gap-3">
        {FREE_CARD_COLORS.map((color) => {
          const selected = !tease && value === color.id;
          return (
            <button
              key={color.id}
              type="button"
              aria-label={t('bannerColourSwatch', {
                color: t(COLOR_LABEL_KEYS[color.id]),
              })}
              aria-pressed={selected}
              onClick={() => {
                onTease(null);
                onChange(color.id);
              }}
              className={swatchClasses}
              style={{
                background: color.banner,
                boxShadow: selected ? SELECTED_RING : undefined,
              }}
            />
          );
        })}

        <span className="h-[22px] w-px bg-white/10" />

        {PREMIUM_CARD_THEMES.map((color) => {
          if (premium) {
            const selected = value === color.id;
            return (
              <button
                key={color.id}
                type="button"
                aria-label={t('bannerThemeSwatch', {
                  color: t(COLOR_LABEL_KEYS[color.id]),
                })}
                aria-pressed={selected}
                onClick={() => onChange(color.id)}
                className={swatchClasses}
                style={{
                  background: color.banner,
                  boxShadow: selected ? SELECTED_RING : undefined,
                }}
              />
            );
          }

          const teased = tease === color.id;
          return (
            <button
              key={color.id}
              type="button"
              aria-label={t('bannerThemeLockedSwatch', {
                color: t(COLOR_LABEL_KEYS[color.id]),
              })}
              aria-pressed={teased}
              onClick={() => onTease(teased ? null : color.id)}
              className={`${swatchClasses} ${
                teased ? 'opacity-100' : 'opacity-40 hover:opacity-75'
              }`}
              style={{
                background: color.banner,
                boxShadow: teased ? TEASE_RING : undefined,
              }}
            />
          );
        })}
      </div>

      <p className="text-[12px] text-gray-500">
        {premium ? t('cardColorHintPremium') : t('cardColorHintFree')}
      </p>

      {!premium && tease ? (
        <p className="text-[13px] text-gray-400 leading-relaxed">
          {t.rich('cardColorTeaseUpsell', {
            theme: t(COLOR_LABEL_KEYS[tease]),
            strong: (chunks) => (
              <strong className="font-semibold text-white">{chunks}</strong>
            ),
            premiumLink: (chunks) => (
              <Link
                href={`/${locale}/settings#premium`}
                className="font-semibold text-primary-light focus:outline-none"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : null}
    </FormGroup>
  );
};
