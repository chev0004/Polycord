import type { CurrentUser } from './auth-session';

export const ENTITLEMENT_LIMITS = {
  'profile.targetLanguages': { free: 2, premium: 10 },
  'profile.tags': { free: 5, premium: 8 },
  'discovery.bumpCooldownMs': {
    free: 3 * 60 * 60 * 1000,
    premium: 90 * 60 * 1000,
  },
  'discovery.monthlyBoosts': { free: 0, premium: 3 },
} as const;

export type LimitEntitlement = keyof typeof ENTITLEMENT_LIMITS;

export const PREMIUM_FEATURES = [
  'profile.voiceIntro',
  'profile.cardThemes',
  'privacy.hiddenVisits',
  'notifications.profileViews',
] as const;

export type FeatureEntitlement = (typeof PREMIUM_FEATURES)[number];

export const entitlementLimit = (
  key: LimitEntitlement,
  premium: boolean,
): number => ENTITLEMENT_LIMITS[key][premium ? 'premium' : 'free'];

export const hasEntitlement = (
  key: FeatureEntitlement,
  premium: boolean,
): boolean => premium || !PREMIUM_FEATURES.includes(key);

export const isPremiumDiscordId = (discordUserId: string) =>
  (process.env.POLYCORD_PREMIUM_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .includes(discordUserId);

export const hasPremiumEntitlement = (user: CurrentUser) =>
  isPremiumDiscordId(user.id);
