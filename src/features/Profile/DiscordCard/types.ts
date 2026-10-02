import type { ComponentType } from 'react';
import type { DiscordCardLayout } from '@/constants/discordCards';

export type DiscordCardTarget = {
  name: string;
  script: string;
  code: string;
  greeting: string;
  level: string;
  steps: number;
};

export type DiscordCardAvailability = {
  days: string;
  range: string;
  rangeShort: string;
  text: string;
  short: string;
  abbr: string;
};

export type DiscordCardData = {
  name: string;
  handle: string;
  avatarUrl?: string;
  initials: string;
  native: {
    name: string;
    script: string;
    code: string;
    greeting: string;
  };
  targets: DiscordCardTarget[];
  tags: string[];
  tagsText: string;
  availability?: DiscordCardAvailability;
  country: string;
  time: string;
};

export type DiscordCardLayoutProps = {
  data: DiscordCardData;
  active: number;
};

export type DiscordCardLayoutDefinition = {
  id: DiscordCardLayout;
  labelKey: string;
  component: ComponentType<DiscordCardLayoutProps>;
};

export const DISCORD_CARD_WIDTH = 934;
export const DISCORD_CARD_HEIGHT = 320;
