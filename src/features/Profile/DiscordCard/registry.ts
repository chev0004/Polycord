import { ClassicCard } from './layouts/ClassicCard';
import type { DiscordCardLayoutDefinition } from './types';

export const DISCORD_CARD_LAYOUTS: DiscordCardLayoutDefinition[] = [
  { id: 'classic', labelKey: 'layoutClassic', component: ClassicCard },
];
