import 'server-only';
import { ImageResponse } from 'next/og';
import { createTranslator } from 'next-intl';
import type { ComponentType, ReactNode } from 'react';
import sharp from 'sharp';
import type { DiscordCardLayout } from '@/constants/discordCards';
import en from '@/locales/en.json';
import {
  DISCORD_CARD_CYCLE,
  DISCORD_CARD_HEIGHT,
  DISCORD_CARD_WIDTH,
  type DiscordCardData,
} from '../types';
import { beatAt, cycling, type Motion, resting, type Shot } from './animation';
import { loadFigtree, loadMono, loadZen } from './fonts';
import { encodeAnimation, replaceFirstFrame } from './gif';
import { BleedImage } from './layouts/bleed';
import {
  CharacterSelectImage,
  characterSelectMotion,
} from './layouts/characterSelect';
import { ClassicImage } from './layouts/classic';
import { DiagonalImage } from './layouts/diagonal';
import { ExchangePassImage } from './layouts/exchangePass';
import { GreetingImage } from './layouts/greeting';
import { MetalImage, metalMotion } from './layouts/metal';
import { MirrorImage } from './layouts/mirror';
import { NowPlayingImage, nowPlayingMotion } from './layouts/nowPlaying';
import { OrbitImage, orbitMotion } from './layouts/orbit';
import { PhotoImage } from './layouts/photo';
import { RankImage, rankMotion } from './layouts/rank';
import { SplitImage } from './layouts/split';
import { SplitFlapImage, splitFlapMotion } from './layouts/splitFlap';
import { WatermarkImage } from './layouts/watermark';
import { createMeasure } from './measure';
import { cardPalette } from './palette';
import type { CardImageProps } from './parts';
import { changedBox } from './pixels';
import { staged } from './staging';

const FPS = 25;

const IMAGE_LAYOUTS: Record<
  DiscordCardLayout,
  [ComponentType<CardImageProps>, Motion]
> = {
  classic: [ClassicImage, cycling(17, { varies: true })],
  rank: [RankImage, rankMotion],
  split: [SplitImage, cycling(16)],
  photo: [PhotoImage, cycling(26)],
  bleed: [BleedImage, cycling(16)],
  diagonal: [DiagonalImage, cycling(16)],
  'exchange-pass': [ExchangePassImage, cycling(72)],
  metal: [MetalImage, metalMotion],
  orbit: [OrbitImage, orbitMotion],
  'now-playing': [NowPlayingImage, nowPlayingMotion],
  greeting: [GreetingImage, cycling(16)],
  mirror: [MirrorImage, cycling(16)],
  watermark: [WatermarkImage, cycling(16)],
  'character-select': [CharacterSelectImage, characterSelectMotion],
  'split-flap': [SplitFlapImage, splitFlapMotion],
};

const t = createTranslator({
  locale: 'en',
  messages: en,
  namespace: 'DiscordCard',
}) as CardImageProps['t'];

const zenText = (data: DiscordCardData) =>
  [data.native, ...data.targets]
    .flatMap(({ script, greeting }) => [script, greeting])
    .join('');

const PLACEHOLDER_TIME = '00:00';

type DiscordCard = {
  layout: DiscordCardLayout;
  data: DiscordCardData;
  banner: string;
  accent: string;
};

const prepare = async ({ layout, data, banner, accent }: DiscordCard) => {
  const [figtree, mono, zen] = await Promise.all([
    loadFigtree(),
    loadMono(),
    loadZen(zenText(data)),
  ]);
  const fonts = [...figtree, ...mono, ...zen];
  const [Layout, motion] = IMAGE_LAYOUTS[layout];
  const palette = cardPalette(banner, accent);
  const measure = createMeasure(fonts);

  const sheet = async (element: ReactNode, width: number, height: number) => {
    const png = new ImageResponse(
      <div
        style={{
          display: 'flex',
          width,
          height,
          fontFamily: 'Figtree',
          color: '#fff',
        }}
      >
        {element}
      </div>,
      { width, height, fonts },
    );
    return new Uint8ClampedArray(
      await sharp(await png.arrayBuffer())
        .ensureAlpha()
        .raw()
        .toBuffer(),
    );
  };

  const shots = new Map<string, ReturnType<typeof sheet>>();
  const shot = (options: Shot = {}) => {
    const key = JSON.stringify(options);
    const taken =
      shots.get(key) ??
      sheet(
        staged(
          <Layout
            data={options.data ?? data}
            active={options.active ?? 0}
            lit={options.lit}
            palette={palette}
            measure={measure}
            t={t}
          />,
          options,
        ),
        DISCORD_CARD_WIDTH,
        DISCORD_CARD_HEIGHT,
      );
    shots.set(key, taken);
    return taken;
  };

  return { motion, palette, measure, sheet, shot };
};

export const renderDiscordCardBase = async (card: DiscordCard) => {
  const data = { ...card.data, time: card.data.time && PLACEHOLDER_TIME };
  const { motion, ...stage } = await prepare({ ...card, data });
  const count = Math.max(1, data.targets.length);
  const { paint, continuous } = await motion({ ...stage, data, t, count });
  const loop = continuous ?? count * DISCORD_CARD_CYCLE;
  const draw = continuous ? paint : resting(paint);
  const frames = Math.round((loop * FPS) / 1000);
  const start = (index: number) => Math.round((index * loop) / frames);
  return encodeAnimation(
    frames,
    (index) => draw(beatAt(start(index), count)),
    (index) => start(index + 1) - start(index),
  );
};

export const stampDiscordCardClock = async (
  base: Buffer,
  card: DiscordCard,
) => {
  if (!card.data.time) return base;
  const { shot } = await prepare(card);
  const [live, placeholder] = await Promise.all([
    shot(),
    shot({ data: { ...card.data, time: PLACEHOLDER_TIME } }),
  ]);
  const box = changedBox(live, placeholder);
  return box ? replaceFirstFrame(base, live, box) : base;
};
