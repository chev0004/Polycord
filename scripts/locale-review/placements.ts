import {
  type Finding,
  locales,
  type Occurrence,
  type Review,
  type SnapshotReview,
} from './review-state';

export type Viewport = 'desktop' | 'mobile';
export type Scene = {
  id: string;
  story: string;
  route: string;
  sectionId: string;
  section: string;
  state: string;
  viewport: Viewport;
  open?: string[];
  privacy?: boolean;
};

type Fixture = [
  story: string,
  state: string,
  viewport: Viewport,
  ...open: string[],
];
export type Section = { id: string; name: string; scenes: Scene[] };

const privacyKeys = new Set([
  'Profile.privacySettings',
  'Profile.privacySettingsDescription',
  ...[
    'makeProfilePublic',
    'allowAnonymousCopying',
    'displayTimezone',
    'displayAvailability',
  ].flatMap((key) => [`Profile.${key}Label`, `Profile.${key}Description`]),
]);

const sections = new Map<string, Section>();

function add(
  id: string,
  name: string,
  route: string,
  prefix: string,
  fixtures: Fixture[],
) {
  const section = sections.get(id) ?? { id, name, scenes: [] };
  for (const [story, state, viewport, ...open] of fixtures) {
    const storyId = `${prefix}--${story}`;
    section.scenes.push({
      id: JSON.stringify([id, route, storyId, viewport, ...open]),
      story: storyId,
      route,
      sectionId: id,
      section: name,
      state,
      viewport,
      open,
      privacy: id === 'profile-privacy',
    });
  }
  sections.set(id, section);
}

add(
  'profile-privacy',
  'Profile / Edit / Privacy Settings',
  '/profile',
  'features-profile-profilepage',
  [
    ['mobile-dock-bump', 'Privacy settings', 'desktop'],
    ['mobile-dock-bump', 'Privacy sheet', 'mobile', 'Profile.statusPublic'],
  ],
);
add('profile', 'Profile / Edit', '/profile', 'features-profile-profilepage', [
  ['with-profile', 'Existing profile', 'desktop'],
  ['with-profile', 'Existing profile', 'mobile'],
  ['with-profile', 'Options menu', 'desktop', 'Profile.profileOptions'],
  ['with-profile', 'Options sheet', 'mobile', 'Profile.profileOptions'],
  ['with-profile', 'Privacy sheet', 'mobile', 'Profile.statusPublic'],
  ['supporter-insights', 'Supporter insights', 'desktop'],
  ['create-mode', 'Create profile', 'desktop'],
  ['create-mode-mobile', 'Create profile', 'mobile'],
]);
add(
  'profile',
  'Profile / Edit',
  '/onboarding',
  'features-profile-profilepage',
  [
    ['create-mode', 'Profile setup', 'desktop'],
    ['create-mode-mobile', 'Profile setup', 'mobile'],
  ],
);
add('profile', 'Profile / Edit', '/u/:id', 'features-profile-profiledetail', [
  ['default', 'Public profile', 'desktop'],
  ['no-timezones', 'No timezone', 'desktop'],
  ['logged-out-private-username', 'Guest with restricted copy', 'desktop'],
]);
add('profile', 'Profile / Edit', '/u/:id', 'discovery-mobileprofilesheet', [
  ['free', 'Public profile sheet', 'mobile'],
]);
add(
  'profile',
  'Profile / Edit',
  '/u/:id',
  'features-profile-memberemptystate',
  [
    ['blocked', 'Blocked profile', 'desktop'],
    ['not-found', 'Missing profile', 'mobile'],
  ],
);
add(
  'profile',
  'Profile / Edit',
  '/profile',
  'features-profile-voiceintroeditor',
  [
    ['free-idle', 'Voice intro', 'desktop'],
    ['free-over-limit-intro', 'Voice intro over the limit', 'desktop'],
    ['saved-intro-on-mobile', 'Saved voice intro', 'mobile'],
  ],
);
add(
  'cards',
  'Discord cards',
  '/profile',
  'features-profile-discordcardpicker',
  [
    ['free', 'Free layouts', 'desktop'],
    ['supporter', 'Supporter layouts', 'desktop'],
    ['server-error', 'Preview error', 'desktop'],
  ],
);
add('cards', 'Discord cards', '/profile', 'features-profile-profilepage', [
  ['with-profile', 'Card settings', 'desktop'],
  [
    'with-profile',
    'Card layout sheet',
    'mobile',
    'Profile.discordCardLayoutLabel',
  ],
]);
add('discover', 'Discover & time', '/', 'discovery-discoverypage', [
  ['default', 'Results', 'desktop'],
  ['mobile', 'Results', 'mobile'],
  ['mobile', 'Filters sheet', 'mobile', 'Discovery.filtersButton'],
  [
    'mobile',
    'Language filter sheet',
    'mobile',
    'Discovery.filtersButton',
    'Discovery.filterPrimaryLanguage',
  ],
  [
    'mobile',
    'Country filter sheet',
    'mobile',
    'Discovery.filtersButton',
    'Discovery.filterCountry',
  ],
  ['default', 'Language filter', 'desktop', 'Discovery.filterTargetLanguage'],
  ['default', 'Country filter', 'desktop', 'Discovery.filterCountry'],
  ['default', 'Timezone filter', 'desktop', 'Discovery.filterTimezone'],
  ['default', 'Availability filter', 'desktop', 'Discovery.filterAvailability'],
  ['empty', 'No matches', 'desktop'],
  ['empty', 'No matches', 'mobile'],
  ['feed-error', 'Feed error', 'desktop'],
  ['feed-error', 'Feed error', 'mobile'],
  ['loading', 'Loading', 'desktop'],
  ['sponsored', 'Sponsor placements', 'desktop'],
  ['sponsored-mobile', 'Sponsor placements', 'mobile'],
]);
add('discover', 'Discover & time', '/', 'discovery-sortmenu', [
  ['default', 'Sort menu', 'desktop', 'Discovery.sortLabel'],
]);
add('discover', 'Discover & time', '/', 'discovery-availabilityrow', [
  ['cross-zone', 'Availability across timezones', 'desktop'],
  ['any-time-row', 'Available any time', 'mobile'],
]);
add('discover', 'Discover & time', '/', 'discovery-pagination', [
  ['default', 'Pagination controls', 'desktop'],
  ['default', 'Pagination controls', 'mobile'],
]);
add('discover', 'Discover & time', '/', 'discovery-voicechip', [
  ['idle', 'Voice clip', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/inbox', 'components-inboxpage', [
  ['free', 'Free inbox', 'desktop'],
  ['free', 'Free inbox', 'mobile'],
  ['supporter', 'Supporter inbox', 'desktop'],
  ['empty', 'Empty inbox', 'desktop'],
  ['empty', 'Empty inbox', 'mobile'],
  ['moderation-note', 'Moderation note', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/inbox', 'inbox-warningnotice', [
  ['before-acknowledgement', 'Unread warning', 'desktop'],
  ['after-acknowledgement', 'Read warning', 'mobile'],
  ['preset', 'Preset warning', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/', 'components-inbox', [
  ['free-notifications', 'Inbox popover', 'desktop'],
  ['supporter-notifications', 'Supporter inbox popover', 'desktop'],
  ['empty', 'Empty inbox popover', 'desktop'],
]);
add(
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-moderationpage',
  [
    ['dummy-data', 'Reports queue', 'desktop'],
    ['dummy-data-mobile', 'Reports queue', 'mobile'],
    ['queue-clear', 'Empty reports', 'desktop'],
    ['mobile-queue-clear', 'Empty reports', 'mobile'],
    [
      'report-reason-filter',
      'Report reason filter',
      'desktop',
      'Admin.allReasons',
    ],
    ['recently-actioned', 'Users', 'desktop', 'Admin.tabUsers'],
    ['activity-log', 'Activity log', 'desktop', 'Admin.tabLog'],
    [
      'suspicious-header-matches-log',
      'Suspicious activity',
      'desktop',
      'Admin.tabSuspicious',
    ],
    ['manage-staff', 'Manage staff dialog', 'desktop', 'Admin.manageStaff'],
    ['sponsors', 'Sponsor management', 'desktop'],
    ['sponsors-mobile', 'Sponsor management', 'mobile'],
  ],
);
add(
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-takeactionpanel',
  [
    ['owner', 'Owner actions', 'desktop'],
    ['moderator', 'Moderator actions', 'desktop'],
    ['load-failed', 'Case load error', 'desktop'],
  ],
);
add(
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-mobiletakeaction',
  [
    ['owner', 'Owner action sheet', 'mobile'],
    ['moderator', 'Moderator action sheet', 'mobile'],
  ],
);
add('moderation', 'Moderation & bans', '/banned', 'banned-bannedscreen', [
  ['default', 'Banned account', 'desktop'],
  ['missing-invite', 'Banned account without invite', 'mobile'],
]);
add('moderation', 'Moderation & bans', '/', 'discovery-reportdialog', [
  ['default', 'Report dialog', 'desktop'],
  ['mobile', 'Report dialog', 'mobile'],
]);
add(
  'settings',
  'Settings & Supporter',
  '/settings',
  'features-settings-settingspage',
  [
    ['default', 'Overview', 'desktop'],
    ['mobile', 'Overview', 'mobile'],
    ['default', 'Appearance', 'desktop', 'Settings.appearanceTitle'],
    ['default', 'Privacy', 'desktop', 'Settings.privacyTitle'],
    ['default', 'Privacy', 'mobile', 'Settings.privacyTitle'],
    ['default', 'Notifications', 'desktop', 'Settings.notificationsTitle'],
    ['default', 'Free plan', 'desktop', 'Settings.premiumTitle'],
    [
      'supporter-tab-supporter',
      'Supporter plan',
      'desktop',
      'Settings.premiumTitle',
    ],
  ],
);
add('saved', 'Saved & blocking', '/saved', 'routes-saved', [
  ['search-filter-and-sort', 'Saved profiles', 'desktop'],
  ['mobile-filters', 'Saved profiles', 'mobile'],
  ['retry-success', 'Load error', 'desktop'],
]);
add(
  'saved',
  'Saved & blocking',
  '/settings#privacy',
  'features-settings-blockedusers',
  [
    ['default', 'Blocked accounts', 'desktop'],
    ['empty', 'No blocked accounts', 'mobile'],
    ['load-failure', 'Accounts load error', 'desktop'],
  ],
);
add('navigation', 'Navigation & shared controls', '/', 'components-navbar', [
  ['logged-out', 'Guest navigation', 'desktop'],
  ['logged-in', 'Member navigation', 'desktop'],
  ['staff-mobile', 'Staff navigation', 'mobile'],
]);
add('navigation', 'Navigation & shared controls', '/', 'components-usermenu', [
  ['default', 'Account menu', 'desktop', 'UserMenu.accountMenu'],
]);
add(
  'navigation',
  'Navigation & shared controls',
  '/',
  'components-languageswitcher',
  [['default', 'Language switcher', 'desktop']],
);
add(
  'navigation',
  'Navigation & shared controls',
  '/',
  'features-footer-footer',
  [
    ['default', 'Footer', 'desktop'],
    ['mobile', 'Footer', 'mobile'],
  ],
);
add(
  'navigation',
  'Navigation & shared controls',
  '/legal',
  'features-legal-legalhub',
  [['default', 'Legal hub', 'desktop']],
);
add(
  'navigation',
  'Navigation & shared controls',
  '/:missing',
  'navigation-recoverypage',
  [
    ['missing', 'Missing page', 'desktop'],
    ['retry', 'Retry page', 'mobile'],
  ],
);
add(
  'analytics',
  'Analytics & diagnostics',
  '/analytics',
  'features-analytics-analyticsdashboard',
  [
    ['default', 'Dashboard', 'desktop'],
    ['default', 'Dashboard', 'mobile'],
    ['empty', 'Empty dashboard', 'desktop'],
  ],
);
add(
  'analytics',
  'Analytics & diagnostics',
  '/settings#dev',
  'features-settings-settingspage',
  [
    ['owner-dev-tab', 'Owner tools', 'desktop', 'Settings.devTitle'],
    ['owner-dev-mobile', 'Owner tools', 'mobile', 'Settings.devTitle'],
  ],
);
add(
  'analytics',
  'Analytics & diagnostics',
  '/',
  'discovery-discoveryloadpanel',
  [
    ['loading', 'Page load trace', 'desktop'],
    ['complete', 'Completed page trace', 'desktop'],
    ['failed', 'Failed page trace', 'desktop'],
    ['settings-navigation', 'Settings navigation trace', 'desktop'],
    ['pagination-reload', 'Pagination trace', 'desktop'],
  ],
);
add(
  'analytics',
  'Analytics & diagnostics',
  '/',
  'navigation-deploymentwatcher',
  [
    ['unsaved-changes-ask-first', 'New version prompt', 'desktop'],
    ['mobile-unsaved-changes-ask-first', 'New version prompt', 'mobile'],
  ],
);
add('notes', 'Cross-audit notes', '', '', []);

export const reviewSections = [...sections.values()];
export const allScenes = reviewSections.flatMap(({ scenes }) => scenes);
const sceneById = new Map(allScenes.map((scene) => [scene.id, scene]));
const sectionByName = new Map(reviewSections.map(({ id, name }) => [name, id]));

export function findingSection(finding: Finding) {
  if (privacyKeys.has(finding.key)) return 'profile-privacy';
  if (finding.area === 'Profile & onboarding') return 'profile';
  return sectionByName.get(finding.area) ?? 'notes';
}

export type Placement = {
  id: string;
  scene: Scene;
  surface: string;
  rendered: Partial<Record<(typeof locales)[number], Occurrence>>;
};

export function indexPlacements(state: SnapshotReview) {
  const placements = new Map<string, Placement>();
  for (const [sceneId, observations] of Object.entries(state.observations)) {
    const scene = sceneById.get(sceneId);
    if (!scene) continue;
    for (const locale of locales) {
      for (const occurrence of observations[locale]?.occurrences ?? []) {
        const existing = placements.get(occurrence.id) ?? {
          id: occurrence.id,
          scene,
          surface: occurrence.surface,
          rendered: {},
        };
        existing.rendered[locale] = occurrence;
        placements.set(occurrence.id, existing);
      }
    }
  }
  const byKey = new Map<string, Placement[]>();
  for (const placement of placements.values()) {
    const key = (placement.rendered.en ?? placement.rendered.ja)?.key;
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)?.push(placement);
  }
  return byKey;
}

export function verified(
  state: SnapshotReview,
  placement: Placement,
  locale: (typeof locales)[number],
) {
  const occurrence = placement.rendered[locale];
  return Boolean(
    occurrence && state.checks[placement.id]?.[locale] === occurrence.text,
  );
}

export function outstanding(
  review: Review,
  finding: Finding,
  placements: Placement[],
  scenes = allScenes,
  requirePlacement = true,
) {
  if (finding.noteOnly) return [];
  const state = review.per[review.base];
  const checks = placements.flatMap((placement) =>
    locales
      .filter((locale) => !verified(state, placement, locale))
      .map((locale) => ({
        placement: placement.id,
        locale,
        reason: placement.rendered[locale]
          ? 'Needs review'
          : 'Placement missing in this locale',
      })),
  );
  const ambiguous = scenes.flatMap((scene) =>
    locales
      .filter((locale) =>
        state.observations[scene.id]?.[locale]?.ambiguous.includes(finding.key),
      )
      .map((locale) => ({
        placement: scene.id,
        locale,
        reason: 'Ambiguous placement',
      })),
  );
  if (!placements.length && requirePlacement) {
    checks.push(
      ...locales.map((locale) => ({
        placement: '',
        locale,
        reason: 'Unmapped placement',
      })),
    );
  }
  return [...checks, ...ambiguous];
}

export function sectionPending(
  review: Review,
  section: Section,
  findings: Finding[],
  placements: Map<string, Placement[]>,
) {
  const state = review.per[review.base];
  return (
    section.scenes.some((scene) =>
      locales.some((locale) => !state.observations[scene.id]?.[locale]),
    ) ||
    findings.some((finding) => {
      const known = placements.get(finding.key) ?? [];
      return (
        outstanding(
          review,
          finding,
          known.filter(({ scene }) => scene.sectionId === section.id),
          section.scenes,
          findingSection(finding) === section.id && !known.length,
        ).length > 0
      );
    })
  );
}
