export const FREE_DISCORD_CARDS = [
  'classic',
  'rank',
  'split',
  'photo',
  'bleed',
  'diagonal',
] as const;

export const PREMIUM_DISCORD_CARDS = [
  'exchange-pass',
  'split-flap',
  'metal',
  'orbit',
  'now-playing',
  'greeting',
  'mirror',
  'watermark',
  'character-select',
] as const;

export const DISCORD_CARDS = [
  ...FREE_DISCORD_CARDS,
  ...PREMIUM_DISCORD_CARDS,
] as const;

export type DiscordCardLayout = (typeof DISCORD_CARDS)[number];

export const DEFAULT_DISCORD_CARD: DiscordCardLayout = 'classic';

export const isDiscordCardLayout = (id: string): id is DiscordCardLayout =>
  (DISCORD_CARDS as readonly string[]).includes(id);

export const isPremiumDiscordCard = (id: string) =>
  (PREMIUM_DISCORD_CARDS as readonly string[]).includes(id);

export const isAllowedDiscordCard = (id: string, premium: boolean) =>
  isDiscordCardLayout(id) && (premium || !isPremiumDiscordCard(id));

export const resolveDiscordCard = (
  stored: string | null | undefined,
  premium: boolean,
): DiscordCardLayout =>
  stored && isAllowedDiscordCard(stored, premium)
    ? (stored as DiscordCardLayout)
    : DEFAULT_DISCORD_CARD;
