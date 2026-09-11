export const ANALYTICS_EVENTS = {
  authSignup: 'auth.signup',
  authLogin: 'auth.login',
  onboardingStart: 'onboarding.start',
  onboardingComplete: 'onboarding.complete',
  profileSave: 'profile.save',
  profileBump: 'profile.bump',
  profileBoost: 'profile.boost',
  discoveryBoostImpressions: 'discovery.boost_impressions',
  discoveryView: 'discovery.view',
  profileView: 'profile.view',
  profileUsernameCopy: 'profile.username_copy',
  profileCopyReceived: 'profile.copy_received',
  profileSaveFavorite: 'profile.save_favorite',
  connectionIntroRequest: 'connection.intro_request',
  safetyReport: 'safety.report',
  safetyBlock: 'safety.block',
  premiumUpgrade: 'premium.upgrade',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_EVENT_NAMES = Object.values(
  ANALYTICS_EVENTS,
) as AnalyticsEventName[];

export const ACTIVATION_FUNNEL: AnalyticsEventName[] = [
  ANALYTICS_EVENTS.authSignup,
  ANALYTICS_EVENTS.onboardingStart,
  ANALYTICS_EVENTS.onboardingComplete,
  ANALYTICS_EVENTS.profileSave,
];

const CLIENT_ANALYTICS_EVENTS: AnalyticsEventName[] = [
  ANALYTICS_EVENTS.profileUsernameCopy,
];

export const isClientAnalyticsEvent = (
  name: string,
): name is AnalyticsEventName =>
  (CLIENT_ANALYTICS_EVENTS as string[]).includes(name);
