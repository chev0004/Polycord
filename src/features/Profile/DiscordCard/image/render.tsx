import 'server-only';
import { ImageResponse } from 'next/og';
import { createTranslator } from 'next-intl';
import type { ComponentType } from 'react';
import type { DiscordCardLayout } from '@/constants/discordCards';
import en from '@/locales/en.json';
import {
  DISCORD_CARD_HEIGHT,
  DISCORD_CARD_WIDTH,
  type DiscordCardData,
} from '../types';
import { loadFigtree, loadMono, loadZen } from './fonts';
import { BleedImage } from './layouts/bleed';
import { CharacterSelectImage } from './layouts/characterSelect';
import { ClassicImage } from './layouts/classic';
import { DiagonalImage } from './layouts/diagonal';
import { ExchangePassImage } from './layouts/exchangePass';
import { GreetingImage } from './layouts/greeting';
import { MetalImage } from './layouts/metal';
import { MirrorImage } from './layouts/mirror';
import { NowPlayingImage } from './layouts/nowPlaying';
import { OrbitImage } from './layouts/orbit';
import { PhotoImage } from './layouts/photo';
import { RankImage } from './layouts/rank';
import { SplitImage } from './layouts/split';
import { SplitFlapImage } from './layouts/splitFlap';
import { WatermarkImage } from './layouts/watermark';
import { createMeasure } from './measure';
import { cardPalette } from './palette';
import type { CardImageProps } from './parts';

const IMAGE_LAYOUTS: Record<
  DiscordCardLayout,
  ComponentType<CardImageProps>
> = {
  classic: ClassicImage,
  rank: RankImage,
  split: SplitImage,
  photo: PhotoImage,
  bleed: BleedImage,
  diagonal: DiagonalImage,
  'exchange-pass': ExchangePassImage,
  metal: MetalImage,
  orbit: OrbitImage,
  'now-playing': NowPlayingImage,
  greeting: GreetingImage,
  mirror: MirrorImage,
  watermark: WatermarkImage,
  'character-select': CharacterSelectImage,
  'split-flap': SplitFlapImage,
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

export const renderDiscordCardImage = async ({
  layout,
  data,
  banner,
  accent,
  headers,
}: {
  layout: DiscordCardLayout;
  data: DiscordCardData;
  banner: string;
  accent: string;
  headers?: HeadersInit;
}) => {
  const [figtree, mono, zen] = await Promise.all([
    loadFigtree(),
    loadMono(),
    loadZen(zenText(data)),
  ]);
  const fonts = [...figtree, ...mono, ...zen];
  const Layout = IMAGE_LAYOUTS[layout];

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: DISCORD_CARD_WIDTH,
        height: DISCORD_CARD_HEIGHT,
        fontFamily: 'Figtree',
        color: '#fff',
      }}
    >
      <Layout
        data={data}
        palette={cardPalette(banner, accent)}
        measure={createMeasure(fonts)}
        t={t}
      />
    </div>,
    {
      width: DISCORD_CARD_WIDTH,
      height: DISCORD_CARD_HEIGHT,
      fonts,
      headers,
    },
  );
};
