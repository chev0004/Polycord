'use client';

import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MdColorize, MdPalette, MdRestartAlt } from 'react-icons/md';
import { FormGroup, Label } from '@/components/Form';
import {
  CUSTOM_CARD_THEME_ID,
  type CustomGradient,
  DEFAULT_CUSTOM_GRADIENT,
  FREE_CARD_COLORS,
  isValidHex,
  PREMIUM_CARD_THEMES,
  rgbToHex,
} from '@/features/Discovery/cardTheme';

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };
type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

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
  'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-[box-shadow,opacity] duration-150 focus:outline-none';

const DEFAULT_HSV: Hsv = { h: 236, s: 61, v: 95 };

const sanitizeHexInput = (value: string) =>
  `#${value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)}`;

const rgbToHsv = ({ r, g, b }: Rgb): Hsv => {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;

  if (delta) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h,
    s: max ? Math.round((delta / max) * 100) : 0,
    v: Math.round(max * 100),
  };
};

const hsvToRgb = ({ h, s, v }: Hsv): Rgb => {
  const ns = s / 100;
  const nv = v / 100;
  const c = nv * ns;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = nv - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

const hsvToHex = (hsv: Hsv) => rgbToHex(hsvToRgb(hsv));

const safeHexToHsv = (hex: string): Hsv => {
  if (!isValidHex(hex)) return DEFAULT_HSV;
  const n = Number.parseInt(hex.slice(1), 16);
  return rgbToHsv({
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  });
};

const useEyeDropperSupport = () => {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'EyeDropper' in window &&
        typeof (window as Window & { EyeDropper?: EyeDropperConstructor })
          .EyeDropper === 'function',
    );
  }, []);

  return supported;
};

type ColorBoardProps = {
  color: string;
  hsv: Hsv;
  onChange: (next: Hsv) => void;
};

const ColorBoard = ({ color, hsv, onChange }: ColorBoardProps) => {
  const t = useTranslations('Profile');
  const boardRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!dragging.current) return;
      pick(event);
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  });

  const pick = (event: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height),
    );
    onChange({
      h: hsv.h,
      s: Math.round(x * 100),
      v: Math.round((1 - y) * 100),
    });
  };

  return (
    <button
      type="button"
      ref={boardRef}
      aria-label={t('colourBoardLabel')}
      className="relative h-[140px] w-full shrink-0 cursor-crosshair rounded-lg p-0 focus:outline-none"
      style={{
        background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${hsv.h},100%,50%))`,
      }}
      onMouseDown={(event) => {
        dragging.current = true;
        pick(event);
      }}
    >
      <div
        className="pointer-events-none absolute h-[14px] w-[14px] rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
        style={{
          left: `${hsv.s}%`,
          top: `${100 - hsv.v}%`,
          transform: 'translate(-50%, -50%)',
          background: isValidHex(color) ? color : '#ffffff',
        }}
      />
    </button>
  );
};

type ColorControlsProps = {
  color: string;
  hsv: Hsv;
  previewLabel: string;
  onHexChange: (next: string) => void;
  onHsvChange: (next: Hsv) => void;
};

const ColorControls = ({
  color,
  hsv,
  previewLabel,
  onHexChange,
  onHsvChange,
}: ColorControlsProps) => {
  const t = useTranslations('Profile');
  const eyeDropperSupported = useEyeDropperSupport();

  const pickFromScreen = async () => {
    if (!eyeDropperSupported) return;
    const EyeDropper = (
      window as Window & { EyeDropper?: EyeDropperConstructor }
    ).EyeDropper;
    if (!EyeDropper) return;

    try {
      const { sRGBHex } = await new EyeDropper().open();
      onHexChange(sRGBHex);
    } catch {}
  };

  return (
    <>
      <ColorBoard color={color} hsv={hsv} onChange={onHsvChange} />
      <input
        type="range"
        min={0}
        max={360}
        value={hsv.h}
        aria-label={t('colourHueLabel')}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full border-0 bg-[linear-gradient(to_right,hsl(0,100%,50%),hsl(30,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))] focus:outline-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
        onChange={(event) => {
          const next = { ...hsv, h: Number(event.target.value) };
          onHsvChange(next);
        }}
      />
      <div className="flex items-center gap-1.5">
        <div
          className="h-[26px] w-[26px] shrink-0 rounded-[7px] border border-white/10"
          style={{ background: isValidHex(color) ? color : '#888888' }}
          title={previewLabel}
        />
        <span className="shrink-0 font-mono text-[13px] text-gray-500">#</span>
        <input
          type="text"
          value={color.replace('#', '')}
          maxLength={6}
          spellCheck={false}
          aria-label={t('colourHexLabel')}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-background-main px-2 py-1.5 font-mono text-[13px] text-white tracking-[0.04em] focus:border-primary focus:outline-none"
          onChange={(event) => {
            const raw = sanitizeHexInput(event.target.value);
            onHexChange(raw);
          }}
        />
        {eyeDropperSupported ? (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-background-main text-gray-400 transition-colors hover:bg-background-dark hover:text-white focus:outline-none"
            aria-label={t('colourEyedropperLabel')}
            title={t('colourEyedropperLabel')}
            onClick={pickFromScreen}
          >
            <MdColorize size={17} />
          </button>
        ) : null}
      </div>
    </>
  );
};

type GradientPickerPopoverProps = {
  gradient: CustomGradient;
  onChange: (next: CustomGradient) => void;
};

export const GradientPickerPopover = ({
  gradient,
  onChange,
}: GradientPickerPopoverProps) => {
  const t = useTranslations('Profile');
  const [activeStop, setActiveStop] = useState<0 | 1>(0);
  const [draftHex, setDraftHex] = useState(gradient.from);
  const activeHex = activeStop === 0 ? gradient.from : gradient.to;
  const activeHsv = safeHexToHsv(isValidHex(draftHex) ? draftHex : activeHex);
  const gradientCss = `linear-gradient(115deg, ${gradient.from}, ${gradient.to})`;

  useEffect(() => {
    setDraftHex(activeHex);
  }, [activeHex]);

  const updateActiveHex = (raw: string) => {
    setDraftHex(raw);
    if (!isValidHex(raw)) return;
    onChange(
      activeStop === 0 ? { ...gradient, from: raw } : { ...gradient, to: raw },
    );
  };

  return (
    <Popover.Content
      side="top"
      align="start"
      sideOffset={8}
      className="z-50 flex w-[236px] select-none flex-col gap-2.5 rounded-[14px] border border-white/10 bg-background-darker p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <div
        className="relative flex h-[34px] shrink-0 items-center rounded-lg"
        style={{ background: gradientCss }}
      >
        <button
          type="button"
          aria-label={t('gradientStartStop')}
          aria-pressed={activeStop === 0}
          className="-translate-y-1/2 absolute top-1/2 left-2 h-5 w-5 rounded-full border-[2.5px] border-white/80 p-0 shadow-[0_1px_5px_rgba(0,0,0,0.5)] transition-[border-color,box-shadow] focus:outline-none aria-pressed:border-white aria-pressed:shadow-[0_0_0_3px_rgba(255,255,255,0.35),0_1px_5px_rgba(0,0,0,0.5)]"
          style={{ background: gradient.from }}
          onClick={() => setActiveStop(0)}
        />
        <button
          type="button"
          aria-label={t('gradientEndStop')}
          aria-pressed={activeStop === 1}
          className="-translate-y-1/2 absolute top-1/2 right-2 h-5 w-5 rounded-full border-[2.5px] border-white/80 p-0 shadow-[0_1px_5px_rgba(0,0,0,0.5)] transition-[border-color,box-shadow] focus:outline-none aria-pressed:border-white aria-pressed:shadow-[0_0_0_3px_rgba(255,255,255,0.35),0_1px_5px_rgba(0,0,0,0.5)]"
          style={{ background: gradient.to }}
          onClick={() => setActiveStop(1)}
        />
      </div>
      <p className="-mt-0.5 text-center text-[11px] text-gray-500">
        {activeStop === 0 ? t('gradientStartStop') : t('gradientEndStop')}
      </p>
      <ColorControls
        color={draftHex}
        hsv={activeHsv}
        previewLabel={t('colourPreviewLabel')}
        onHexChange={updateActiveHex}
        onHsvChange={(next) => updateActiveHex(hsvToHex(next))}
      />
    </Popover.Content>
  );
};

type GradientColorPickerProps = {
  gradient: CustomGradient;
  isActive: boolean;
  onChange: (next: CustomGradient) => void;
};

export const GradientColorPicker = ({
  gradient,
  isActive,
  onChange,
}: GradientColorPickerProps) => {
  const t = useTranslations('Profile');
  const gradientCss = `linear-gradient(115deg, ${gradient.from}, ${gradient.to})`;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t('customGradientPickerLabel')}
          aria-pressed={isActive}
          className={swatchClasses}
          style={{
            background: gradientCss,
            boxShadow: isActive ? SELECTED_RING : undefined,
          }}
        >
          <MdPalette
            size={15}
            className="text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <GradientPickerPopover gradient={gradient} onChange={onChange} />
      </Popover.Portal>
    </Popover.Root>
  );
};

type AccentPickerProps = {
  value: string | null;
  autoColor: string;
  onChange: (next: string | null) => void;
};

export const AccentPicker = ({
  value,
  autoColor,
  onChange,
}: AccentPickerProps) => {
  const t = useTranslations('Profile');
  const display = value && isValidHex(value) ? value : autoColor;
  const [draftHex, setDraftHex] = useState(display);
  const activeHsv = safeHexToHsv(isValidHex(draftHex) ? draftHex : display);

  useEffect(() => {
    setDraftHex(display);
  }, [display]);

  const updateHex = (raw: string) => {
    setDraftHex(raw);
    if (isValidHex(raw)) {
      onChange(raw);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={t('accentPickerLabel')}
            className={swatchClasses}
            style={{
              background: display,
              boxShadow: value ? SELECTED_RING : undefined,
            }}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="start"
            sideOffset={8}
            className="z-50 flex w-[236px] select-none flex-col gap-2.5 rounded-[14px] border border-white/10 bg-background-darker p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <ColorControls
              color={draftHex}
              hsv={activeHsv}
              previewLabel={t('colourPreviewLabel')}
              onHexChange={updateHex}
              onHsvChange={(next) => updateHex(hsvToHex(next))}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {value ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[12px] text-gray-500 transition-colors hover:text-white focus:outline-none"
          onClick={() => onChange(null)}
        >
          <MdRestartAlt size={15} />
          {t('accentReset')}
        </button>
      ) : null}
    </div>
  );
};

type CardColorPickerProps = {
  value: string;
  onChange: (id: string) => void;
  premium?: boolean;
  tease: string | null;
  onTease: (id: string | null) => void;
  customGradient?: CustomGradient;
  accentOverride?: string | null;
  autoAccent?: string;
  onCustomGradient?: (gradient: CustomGradient) => void;
  onAccentOverride?: (color: string | null) => void;
};

export const CardColorPicker = ({
  value,
  onChange,
  premium = false,
  tease,
  onTease,
  customGradient = DEFAULT_CUSTOM_GRADIENT,
  accentOverride = null,
  autoAccent = DEFAULT_CUSTOM_GRADIENT.from,
  onCustomGradient,
  onAccentOverride,
}: CardColorPickerProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();

  return (
    <>
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

          {premium ? (
            <GradientColorPicker
              gradient={customGradient}
              isActive={value === CUSTOM_CARD_THEME_ID}
              onChange={(gradient) => {
                onCustomGradient?.(gradient);
                onChange(CUSTOM_CARD_THEME_ID);
              }}
            />
          ) : null}
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

      {premium ? (
        <FormGroup>
          <Label>{t('accentColourLabel')}</Label>
          <AccentPicker
            value={accentOverride}
            autoColor={autoAccent}
            onChange={(color) => onAccentOverride?.(color)}
          />
          <p className="text-[12px] text-gray-500">{t('accentColourHint')}</p>
        </FormGroup>
      ) : null}
    </>
  );
};
