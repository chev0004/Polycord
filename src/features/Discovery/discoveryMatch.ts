import type { DiscoveryProfile } from './ProfileCard';

export type ViewerMatchProfile = {
  primaryLanguage: string;
  targetLanguages: { language: string; level?: string }[];
  interests: string[];
  timezone?: string;
};

export type MatchReason =
  | { key: 'mutual' }
  | { key: 'speaksYourTarget'; language: string }
  | { key: 'learnsYourNative'; language: string }
  | { key: 'sharedInterests'; count: number }
  | { key: 'sameTimezone' };

export const MATCH_WEIGHTS = {
  speaksYourTarget: 50,
  learnsYourNative: 30,
  proficiencyStep: 4,
  sharedTargetLanguage: 10,
  maxSharedTargetLanguages: 3,
  perSharedInterest: 5,
  maxSharedInterestBonus: 20,
  closeTimezone: 12,
  nearbyTimezone: 6,
} as const;

const CLOSE_TIMEZONE_HOURS = 2;
const NEARBY_TIMEZONE_HOURS = 5;

const PROFICIENCY_ORDINAL: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const lower = (value: string) => value.toLowerCase();

const timezoneOffsetMinutes = (timezone: string): number | null => {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((local.getTime() - utc.getTime()) / 60000);
  } catch {
    return null;
  }
};

const timezoneHoursApart = (a?: string, b?: string): number | null => {
  if (!a || !b) return null;
  const offsetA = timezoneOffsetMinutes(a);
  const offsetB = timezoneOffsetMinutes(b);
  if (offsetA === null || offsetB === null) return null;
  return Math.abs(offsetA - offsetB) / 60;
};

const countSharedInterests = (a: string[], b: string[]): number => {
  const set = new Set(a.map(lower));
  let shared = 0;
  for (const interest of b) {
    if (set.has(lower(interest))) shared += 1;
  }
  return shared;
};

type MatchBreakdown = {
  speaksYourTarget: boolean;
  learnsYourNative: boolean;
  partnerLevelInYourNative: number;
  sharedTargetLanguages: number;
  sharedInterests: number;
  timezoneHours: number | null;
};

const analyzeMatch = (
  viewer: ViewerMatchProfile,
  profile: DiscoveryProfile,
): MatchBreakdown => {
  const myNative = lower(viewer.primaryLanguage);
  const myTargets = new Set(
    viewer.targetLanguages.map((target) => lower(target.language)),
  );
  const partnerNative = lower(String(profile.primaryLanguage));
  const partnerTargets = new Set(
    profile.targetLanguages.map((target) => lower(String(target.language))),
  );

  const speaksYourTarget = myTargets.has(partnerNative);
  const learnsYourNative = partnerTargets.has(myNative);

  let partnerLevelInYourNative = 0;
  if (learnsYourNative) {
    const entry = profile.targetLanguages.find(
      (target) => lower(String(target.language)) === myNative,
    );
    partnerLevelInYourNative = entry?.level
      ? (PROFICIENCY_ORDINAL[lower(String(entry.level))] ?? 0)
      : 0;
  }

  let sharedTargetLanguages = 0;
  for (const target of myTargets) {
    if (target !== partnerNative && partnerTargets.has(target)) {
      sharedTargetLanguages += 1;
    }
  }

  return {
    speaksYourTarget,
    learnsYourNative,
    partnerLevelInYourNative,
    sharedTargetLanguages,
    sharedInterests: countSharedInterests(viewer.interests, profile.interests),
    timezoneHours: timezoneHoursApart(viewer.timezone, profile.timezone),
  };
};

export const scoreProfile = (
  viewer: ViewerMatchProfile,
  profile: DiscoveryProfile,
): number => {
  const breakdown = analyzeMatch(viewer, profile);
  let score = 0;

  if (breakdown.speaksYourTarget) {
    score += MATCH_WEIGHTS.speaksYourTarget;
  }
  if (breakdown.learnsYourNative) {
    score +=
      MATCH_WEIGHTS.learnsYourNative +
      breakdown.partnerLevelInYourNative * MATCH_WEIGHTS.proficiencyStep;
  }
  score +=
    Math.min(
      breakdown.sharedTargetLanguages,
      MATCH_WEIGHTS.maxSharedTargetLanguages,
    ) * MATCH_WEIGHTS.sharedTargetLanguage;
  score += Math.min(
    breakdown.sharedInterests * MATCH_WEIGHTS.perSharedInterest,
    MATCH_WEIGHTS.maxSharedInterestBonus,
  );
  if (breakdown.timezoneHours !== null) {
    if (breakdown.timezoneHours <= CLOSE_TIMEZONE_HOURS) {
      score += MATCH_WEIGHTS.closeTimezone;
    } else if (breakdown.timezoneHours <= NEARBY_TIMEZONE_HOURS) {
      score += MATCH_WEIGHTS.nearbyTimezone;
    }
  }

  return score;
};

export const getMatchReason = (
  viewer: ViewerMatchProfile,
  profile: DiscoveryProfile,
): MatchReason | null => {
  const breakdown = analyzeMatch(viewer, profile);

  if (breakdown.speaksYourTarget && breakdown.learnsYourNative) {
    return { key: 'mutual' };
  }
  if (breakdown.speaksYourTarget) {
    return {
      key: 'speaksYourTarget',
      language: String(profile.primaryLanguage),
    };
  }
  if (breakdown.learnsYourNative) {
    return { key: 'learnsYourNative', language: viewer.primaryLanguage };
  }
  if (breakdown.sharedInterests > 0) {
    return { key: 'sharedInterests', count: breakdown.sharedInterests };
  }
  if (
    breakdown.timezoneHours !== null &&
    breakdown.timezoneHours <= CLOSE_TIMEZONE_HOURS
  ) {
    return { key: 'sameTimezone' };
  }
  return null;
};

export const rankProfiles = (
  viewer: ViewerMatchProfile,
  profiles: DiscoveryProfile[],
): DiscoveryProfile[] =>
  profiles
    .map((profile) => ({ profile, score: scoreProfile(viewer, profile) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.profile.bumpedMinutesAgo ?? Number.POSITIVE_INFINITY) -
          (b.profile.bumpedMinutesAgo ?? Number.POSITIVE_INFINITY) ||
        a.profile.displayName.localeCompare(b.profile.displayName),
    )
    .map((entry) => entry.profile);

export const hasViewerMatchProfile = (
  viewer: ViewerMatchProfile | null | undefined,
): viewer is ViewerMatchProfile =>
  Boolean(viewer?.primaryLanguage && viewer.targetLanguages.length > 0);
