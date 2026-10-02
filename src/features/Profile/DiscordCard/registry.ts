import { BleedCard } from './layouts/BleedCard';
import { CharacterSelectCard } from './layouts/CharacterSelectCard';
import { ClassicCard } from './layouts/ClassicCard';
import { DiagonalCard } from './layouts/DiagonalCard';
import { GreetingCard } from './layouts/GreetingCard';
import { MirrorCard } from './layouts/MirrorCard';
import { PhotoCard } from './layouts/PhotoCard';
import { RankCard } from './layouts/RankCard';
import { SplitCard } from './layouts/SplitCard';
import { WatermarkCard } from './layouts/WatermarkCard';
import type { DiscordCardLayoutDefinition } from './types';

export const DISCORD_CARD_LAYOUTS: DiscordCardLayoutDefinition[] = [
  { id: 'classic', labelKey: 'layoutClassic', component: ClassicCard },
  { id: 'rank', labelKey: 'layoutRank', component: RankCard },
  { id: 'split', labelKey: 'layoutSplit', component: SplitCard },
  { id: 'greeting', labelKey: 'layoutGreeting', component: GreetingCard },
  { id: 'mirror', labelKey: 'layoutMirror', component: MirrorCard },
  { id: 'photo', labelKey: 'layoutPhoto', component: PhotoCard },
  { id: 'watermark', labelKey: 'layoutWatermark', component: WatermarkCard },
  { id: 'bleed', labelKey: 'layoutBleed', component: BleedCard },
  { id: 'diagonal', labelKey: 'layoutDiagonal', component: DiagonalCard },
  {
    id: 'character-select',
    labelKey: 'layoutCharacterSelect',
    component: CharacterSelectCard,
  },
];
