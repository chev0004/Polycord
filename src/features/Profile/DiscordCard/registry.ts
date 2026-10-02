import { BleedCard } from './layouts/BleedCard';
import { CharacterSelectCard } from './layouts/CharacterSelectCard';
import { ClassicCard } from './layouts/ClassicCard';
import { DiagonalCard } from './layouts/DiagonalCard';
import { ExchangePassCard } from './layouts/ExchangePassCard';
import { GreetingCard } from './layouts/GreetingCard';
import { MetalCard } from './layouts/MetalCard';
import { MirrorCard } from './layouts/MirrorCard';
import { NowPlayingCard } from './layouts/NowPlayingCard';
import { OrbitCard } from './layouts/OrbitCard';
import { PhotoCard } from './layouts/PhotoCard';
import { RankCard } from './layouts/RankCard';
import { SplitCard } from './layouts/SplitCard';
import { SplitFlapCard } from './layouts/SplitFlapCard';
import { WatermarkCard } from './layouts/WatermarkCard';
import type { DiscordCardLayoutDefinition } from './types';

export const DISCORD_CARD_LAYOUTS: DiscordCardLayoutDefinition[] = [
  { id: 'classic', labelKey: 'layoutClassic', component: ClassicCard },
  { id: 'rank', labelKey: 'layoutRank', component: RankCard },
  { id: 'split', labelKey: 'layoutSplit', component: SplitCard },
  { id: 'photo', labelKey: 'layoutPhoto', component: PhotoCard },
  { id: 'bleed', labelKey: 'layoutBleed', component: BleedCard },
  { id: 'diagonal', labelKey: 'layoutDiagonal', component: DiagonalCard },
  {
    id: 'exchange-pass',
    labelKey: 'layoutExchangePass',
    component: ExchangePassCard,
  },
  { id: 'split-flap', labelKey: 'layoutSplitFlap', component: SplitFlapCard },
  { id: 'metal', labelKey: 'layoutMetal', component: MetalCard },
  { id: 'orbit', labelKey: 'layoutOrbit', component: OrbitCard },
  {
    id: 'now-playing',
    labelKey: 'layoutNowPlaying',
    component: NowPlayingCard,
  },
  { id: 'greeting', labelKey: 'layoutGreeting', component: GreetingCard },
  { id: 'mirror', labelKey: 'layoutMirror', component: MirrorCard },
  { id: 'watermark', labelKey: 'layoutWatermark', component: WatermarkCard },
  {
    id: 'character-select',
    labelKey: 'layoutCharacterSelect',
    component: CharacterSelectCard,
  },
];
