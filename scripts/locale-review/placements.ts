import {
  type Finding,
  type Locale,
  locales,
  type Observation,
  type Occurrence,
  type Review,
  verified,
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
const both = (story: string, state: string, ...open: string[]): Fixture[] => [
  [story, state, 'desktop', ...open],
  [story, state, 'mobile', ...open],
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
add('profile', 'Profile / Edit', '/profile', 'features-profile-profilepage', [
  ['restored-draft', 'Restored draft', 'desktop'],
  ['restored-draft', 'Restored draft', 'mobile'],
  ['lapsed-over-limit', 'Over the free limits', 'desktop'],
]);
add(
  'profile',
  'Profile / Edit',
  '/profile',
  'features-profile-availabilityeditor',
  [
    ['requires-timezone', 'Free time without timezone', 'desktop'],
    ['twelve-hour-layout', 'Twelve hour clock', 'desktop'],
  ],
);
add('profile', 'Profile / Edit', '/profile', 'review-profile', [
  ['unlisted', 'Unlisted profile', 'mobile'],
  ['unlisted', 'Preview mode', 'mobile', 'Profile.modePreview'],
  ['unlisted', 'Name sheet', 'mobile', '=Kenji Ito'],
  ['unlisted', 'Location sheet', 'mobile', 'Profile.countryLabel'],
  [
    'unlisted',
    'Duplicate tag',
    'desktop',
    'Profile.tagsPlaceholder <- Anime',
    'Profile.addTag',
  ],
  [
    'unlisted',
    'Delete confirmation',
    'desktop',
    'Profile.profileOptions',
    'Profile.deleteProfile',
  ],
  [
    'missing-fields',
    'Missing required fields',
    'desktop',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'missing-fields',
    'Missing required fields',
    'mobile',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'invalid-fields',
    'Invalid fields',
    'desktop',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'invalid-fields',
    'Invalid fields',
    'mobile',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'duplicate-languages',
    'Duplicate language',
    'desktop',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'duplicate-languages',
    'Duplicate language',
    'mobile',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'too-many-languages',
    'Too many languages',
    'desktop',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'too-many-languages',
    'Too many languages',
    'mobile',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'locked-card',
    'Locked card layout',
    'desktop',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'locked-card',
    'Locked card layout',
    'mobile',
    'textarea <- I am looking for a patient partner to practice with.',
    'button[type="submit"]',
  ],
  [
    'bumped',
    'Bumped',
    'desktop',
    'Profile.profileOptions',
    'Profile.bumpProfile',
  ],
  ['weekend-card', 'Weekend card', 'desktop'],
  ['weekend-card', 'Weekend card preview', 'mobile', 'Profile.modePreview'],
  ['bumped', 'Bumped', 'mobile'],
  [
    'bump-too-soon',
    'Bump too soon',
    'desktop',
    'Profile.profileOptions',
    'Profile.bumpProfile',
  ],
  ['cooling-down', 'Bump cooldown', 'desktop', 'Profile.profileOptions'],
  [
    'unlisted',
    'Empty country search',
    'mobile',
    'Profile.countryLabel',
    'Profile.addCountry',
    'input[type="text"] <- zzzz',
    '?Sheet.noResults',
  ],
  ['boost-ready', 'Boost ready', 'desktop'],
  ['boost-live', 'Boost running', 'desktop'],
  ['boost-empty', 'No boosts left', 'desktop'],
  [
    'voice-recording',
    'Unsaved voice clip',
    'desktop',
    'Profile.voiceIntroRecordLabel',
    'Profile.voiceIntroStopLabel',
    '?Profile.voiceIntroSaveLabel',
  ],
  [
    'voice-recording',
    'Voice save error',
    'desktop',
    'Profile.voiceIntroRecordLabel',
    'Profile.voiceIntroStopLabel',
    '?Profile.voiceIntroSaveLabel',
    'Profile.voiceIntroSaveLabel',
    '?Profile.voiceIntroError',
  ],
  [
    'voice-blocked',
    'Microphone blocked',
    'desktop',
    'Profile.voiceIntroRecordLabel',
    '?Profile.voiceIntroMicError',
  ],
  ['same-time', 'Same time zone', 'desktop'],
  ['hours-behind', 'Hours behind', 'desktop'],
]);
add('profile', 'Profile / Edit', '/profile', 'review-general', [
  ...both(
    'saved-voice-intro',
    'Playing saved voice intro',
    'Profile.voicePlayerPlay',
    '?Profile.voicePlayerPause',
  ),
]);
add(
  'profile',
  'Profile / Edit',
  '/profile',
  'features-profile-cardcolorpicker',
  [
    ['free', 'Supporter colour teaser', 'desktop', 'Profile.cardColorIndigo'],
    [
      'supporter-custom-gradient',
      'Custom gradient picker',
      'desktop',
      'Profile.customGradientPickerLabel',
    ],
    [
      'supporter-accent-override',
      'Accent override',
      'desktop',
      'Profile.accentPickerLabel',
      'Profile.colourHexLabel <- 00ffaa',
    ],
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
add('cards', 'Discord cards', '/profile', 'features-profile-profilepage', [
  [
    'free-custom-colour-preview',
    'Custom gradient preview',
    'desktop',
    'Profile.customGradientPickerLabel',
    'Profile.colourHexLabel <- 22cc88',
    'Escape',
    '?Profile.cardColorCustomPreviewUpsell',
  ],
  [
    'mobile-free-custom-colour-preview',
    'Custom gradient preview',
    'mobile',
    'Profile.cardStyle',
    'Profile.customGradientPickerLabel',
    'Profile.colourHexLabel <- 22cc88',
    'Escape',
    '?Profile.cardColorCustomPreviewUpsell',
  ],
]);
add(
  'cards',
  'Discord cards',
  '/profile',
  'features-profile-discordcardpicker',
  [['free', 'Supporter layout teaser', 'desktop', 'DiscordCard.layoutMetal']],
);
add('cards', 'Discord cards', '/profile', 'features-profile-profilepage', [
  [
    'with-profile',
    'Supporter layout sheet',
    'mobile',
    'Profile.discordCardLayoutLabel',
    'DiscordCard.layoutMetal',
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
add('discover', 'Discover & time', '/', 'components-toast', [
  ['action-prompts', 'Action toasts', 'desktop'],
]);
add('discover', 'Discover & time', '/', 'discovery-profilegrid', [
  ['empty-state', 'No profiles yet', 'desktop'],
]);
add('discover', 'Discover & time', '/', 'discovery-tagcloud', [
  ['mobile-at-limit', 'Tag limit', 'mobile'],
]);
add('discover', 'Discover & time', '/', 'features-profile-profilesheethost', [
  ['waiting-for-discovery', 'Profile sheet', 'desktop'],
]);
add('discover', 'Discover & time', '/', 'review-discovery', [
  ['sign-in-failed', 'Sign in failed', 'desktop'],
  ['sign-in-suspended', 'Suspended sign in', 'desktop'],
  ['onboarding-started', 'Onboarding prompt', 'desktop'],
  ['onboarding-ready', 'Onboarding ready', 'desktop'],
  ...both(
    'guest',
    'Save sign-in prompt',
    'Discovery.cardMenu',
    'Discovery.saveProfile',
    '?Discovery.saveLoginTitle',
  ),
  ...both(
    'guest',
    'Report sign-in prompt',
    'Discovery.cardMenu',
    'Discovery.reportProfile',
    '?Discovery.reportLoginTitle',
  ),
  ...both(
    'guest',
    'Block sign-in prompt',
    'Discovery.cardMenu',
    'Discovery.blockProfile',
    'Discovery.blockConfirm',
    '?Discovery.blockLoginTitle',
  ),
  ...both(
    'save-failure',
    'Save failed toast',
    'Discovery.cardMenu',
    'Discovery.saveProfile',
    '?Discovery.saveError',
  ),
  ...both(
    'report-success',
    'Report sent toast',
    'Discovery.cardMenu',
    'Discovery.reportProfile',
    'Discovery.reportReasonSpam',
    'Discovery.reportSubmit',
    '?Discovery.reportSuccessTitle',
  ),
  ...both(
    'report-failure',
    'Report failed toast',
    'Discovery.cardMenu',
    'Discovery.reportProfile',
    'Discovery.reportReasonSpam',
    'Discovery.reportSubmit',
    '?Discovery.reportErrorTitle',
  ),
  ...both(
    'report-limited',
    'Report cooldown toast',
    'Discovery.cardMenu',
    'Discovery.reportProfile',
    'Discovery.reportReasonSpam',
    'Discovery.reportSubmit',
    '?Discovery.reportCooldownTitle',
  ),
  ...both(
    'block-success',
    'Profile blocked toast',
    'Discovery.cardMenu',
    'Discovery.blockProfile',
    'Discovery.blockConfirm',
    '?Discovery.blockSuccessTitle',
  ),
  ...both(
    'share-failure',
    'Share error toast',
    'Discovery.cardMenu',
    'Discovery.shareProfile',
    '?Discovery.shareErrorTitle',
  ),
  [
    'bump-limited',
    'Bump cooldown toast',
    'desktop',
    'UserMenu.accountMenu',
    'UserMenu.bumpProfile',
    '?Discovery.bumpCooldownTitle',
  ],
  ['card-menu', 'Card menu', 'desktop', 'Discovery.cardMenu'],
  ['saved-card-menu', 'Saved card menu', 'desktop', 'Discovery.cardMenu'],
  ['block-user', 'Block dialog', 'desktop'],
  ['report-unnamed', 'Report dialog', 'desktop'],
  ['filtered-tags', 'Applied filters', 'desktop'],
  ['filtered-tags', 'Expanded tags', 'mobile', 'Discovery.tagCloudMore'],
]);
add('discover', 'Discover & time', '/', 'discovery-discoverypage', [
  [
    'bump-profile',
    'Bump success toast',
    'desktop',
    'UserMenu.accountMenu',
    'UserMenu.bumpProfile',
    '?Discovery.bumpSuccessTitle',
  ],
  [
    'availability-filter',
    'Availability options',
    'desktop',
    'Discovery.filterAvailability',
  ],
]);
add('discover', 'Discover & time', '/', 'discovery-voicechip', [
  ['idle', 'Voice clip playing', 'desktop', 'Discovery.voiceIntroPlay'],
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
add('inbox', 'Inbox, warnings & push', '/', 'components-inboxwrites', [
  ['dock-badge-follows-pending-read', 'Unread dock badge', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/', 'components-notificationentry', [
  ['share-free', 'Free share alert', 'desktop'],
  ['share-guest', 'Guest share alert', 'desktop'],
  ['share-hidden', 'Hidden user share alert', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/inbox', 'inbox-warningnotice', [
  ['impersonation', 'Impersonation warning', 'desktop'],
  ['custom-message', 'Custom warning', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/inbox', 'review-general', [
  ['view-alerts', 'View alerts', 'desktop'],
]);
add('inbox', 'Inbox, warnings & push', '/', 'review-general', [
  [
    'inbox-load-failure',
    'Inbox load error',
    'desktop',
    'Inbox.notifications',
    '?Inbox.loadError',
  ],
  [
    'inbox-write-failure',
    'Inbox write error',
    'desktop',
    'Inbox.notifications',
    'Inbox.markAllRead',
    '?Inbox.writeError',
  ],
]);
add('inbox', 'Inbox, warnings & push', '/', 'components-inbox', [
  [
    'incoming-toasts-free',
    'Incoming notifications',
    'desktop',
    'refresh inbox',
    '?Inbox.newNotification',
  ],
  [
    'incoming-toasts-supporter',
    'Incoming Supporter notifications',
    'desktop',
    'refresh inbox',
    '?Inbox.newNotification',
  ],
  [
    'incoming-toasts-supporter',
    'Incoming phone notification',
    'mobile',
    'refresh inbox',
    '?.MobileToast[data-state="open"]',
  ],
]);
add('inbox', 'Inbox, warnings & push', '/inbox', 'review-general', [
  ['spam-warning', 'Spam notice', 'desktop'],
  ['hate-warning', 'Hate notice', 'desktop'],
  ['inappropriate-warning', 'Inappropriate notice', 'desktop'],
  ['impersonation-warning', 'Impersonation notice', 'mobile'],
  ['privacy-warning', 'Privacy notice', 'mobile'],
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
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-moderationpage',
  [['supporter-other-sources', 'Supporter from other sources', 'desktop']],
);
add(
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-takeactionpanel',
  [
    ['own-account', 'Own account', 'desktop'],
    ['moderator-protected-from-owner', 'Owner is protected', 'desktop'],
    ['owner-moderates-moderator', 'Owner moderates staff', 'desktop'],
  ],
);
add(
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-mobiletakeaction',
  [
    ['owner-moderates-moderator', 'Owner moderates staff', 'mobile'],
    ['moderator-protected-from-moderator', 'Staff is protected', 'mobile'],
  ],
);
add('moderation', 'Moderation & bans', '/', 'discovery-profilecard', [
  ['moderation-chips-for-staff', 'Staff moderation chips', 'desktop'],
]);
add('moderation', 'Moderation & bans', '/admin', 'review-admin', [
  ['records', 'Case with history', 'desktop'],
  ['records', 'Resolved selection', 'desktop', 'Admin.resolved'],
  ['records', 'Resolved case', 'desktop', 'Admin.resolved', '=Mina Park'],
  ['records', 'Users with history', 'desktop', 'Admin.tabUsers'],
  ['records', 'Action filter', 'desktop', 'Admin.tabUsers', 'Admin.allActions'],
  [
    'records',
    'Suspended account',
    'desktop',
    'Admin.tabUsers',
    '=Dmitri Volkov',
  ],
  ['records', 'Unlisted account', 'desktop', 'Admin.tabUsers', '=Mina Park'],
  ['records', 'Supporter account', 'desktop', 'Admin.tabUsers', '=Haruka Sato'],
  [
    'records',
    'User search',
    'desktop',
    'Admin.tabUsers',
    'Admin.searchPlaceholder <- ryan',
    '?Admin.resultsCount',
    '=Ryan Mercer',
  ],
  ['records', 'History log', 'desktop', 'Admin.tabLog'],
  ['records', 'Log calendar', 'desktop', 'Admin.tabLog', 'Admin.selectDate'],
  ['records', 'Report calendar', 'desktop', 'Admin.selectDate'],
  [
    'records',
    'Account calendar',
    'desktop',
    'Admin.tabUsers',
    'Admin.selectDate',
  ],
  ['records', 'Flagged activity', 'desktop', 'Admin.tabSuspicious'],
  [
    'records',
    'Flagged calendar',
    'desktop',
    'Admin.tabSuspicious',
    'Admin.selectDate',
  ],
  ['records', 'Suspend confirmation', 'desktop', 'Admin.suspend'],
  [
    'records',
    'Invalid suspension',
    'desktop',
    'Admin.suspend',
    'Admin.custom',
    'input[type="number"], input[inputmode="numeric"] <- 120',
  ],
  ['records', 'Ban confirmation', 'desktop', 'Admin.ban'],
  ['records', 'Dismiss confirmation', 'desktop', 'Admin.dismissCount'],
  ['records', 'Hide confirmation', 'desktop', 'Admin.hideProfile'],
  ['records', 'Warning composer', 'desktop', 'Admin.warn'],
  [
    'records',
    'Preset warning',
    'desktop',
    'Admin.warn',
    'Admin.warnPresetPrivacy',
  ],
  ['records', 'Custom warning', 'desktop', 'Admin.warn', 'Admin.warnCustom'],
  [
    'records',
    'Unhide confirmation',
    'desktop',
    'Admin.tabUsers',
    '=Dmitri Volkov',
    'Admin.unhideProfile',
  ],
  [
    'records',
    'Staff search',
    'desktop',
    'Admin.manageStaff',
    'Admin.addModerator',
    'Admin.addModeratorPlaceholder <- zzzz',
    '?Admin.noStaffMatches',
  ],
  [
    'records',
    'Observed addresses',
    'desktop',
    'Admin.manageIpBlocks',
    'Admin.ipAccountPlaceholder <- ryan',
    '[role="option"]',
    '?Admin.observedIps',
  ],
  ['records', 'Case list', 'mobile'],
  ['records', 'Reason sheet', 'mobile', 'Admin.allReasons'],
  ['records', 'Swiped case', 'mobile', 'swipe =Ryan Mercer'],
  ['records', 'Case page', 'mobile', '=Ryan Mercer'],
  ['records', 'Resolved case page', 'mobile', 'Admin.resolved', '=Mina Park'],
  ['records', 'Users with history', 'mobile', 'Admin.tabUsers'],
  ['empty', 'No resolved reports', 'desktop', 'Admin.resolved'],
  [
    'empty',
    'No matching reports',
    'desktop',
    'Admin.allReasons',
    'Admin.reason_spam',
  ],
  ['empty', 'No actioned accounts', 'desktop', 'Admin.tabUsers'],
  [
    'empty',
    'No search results',
    'desktop',
    'Admin.tabUsers',
    'Admin.searchPlaceholder <- zzzz',
    '?Admin.noUsersTitle',
  ],
  [
    'empty',
    'No matching actions',
    'desktop',
    'Admin.tabUsers',
    'Admin.allActions',
    'Admin.action_ban',
  ],
  ['empty', 'Empty log', 'desktop', 'Admin.tabLog'],
  ['empty', 'No flagged activity', 'desktop', 'Admin.tabSuspicious'],
  ['loading', 'Loading activity', 'desktop', 'Admin.tabLog'],
  [
    'sign-in-again',
    'Session expired',
    'desktop',
    'Admin.ban',
    'Admin.banConfirm',
    '?Admin.signInAgain',
  ],
  ['action-toasts', 'Action toasts', 'desktop'],
  ['sheet-member', 'Member actions', 'mobile'],
  ['sheet-member', 'Warning sheet', 'mobile', 'Admin.warn'],
  [
    'sheet-member',
    'Custom warning sheet',
    'mobile',
    'Admin.warn',
    'Admin.warnCustom',
  ],
  ['sheet-member', 'Suspend sheet', 'mobile', 'Admin.suspend'],
  [
    'sheet-member',
    'Invalid suspension sheet',
    'mobile',
    'Admin.suspend',
    'Admin.custom',
    'input[type="number"], input[inputmode="numeric"] <- 120',
  ],
  ['sheet-member', 'Ban sheet', 'mobile', 'Admin.ban'],
  ['sheet-member', 'Hide sheet', 'mobile', 'Admin.hideProfile'],
  ['sheet-member', 'Grant sheet', 'mobile', 'Admin.grantPremium'],
  ['sheet-suspended', 'Suspended actions', 'mobile'],
  ['sheet-suspended', 'Unhide sheet', 'mobile', 'Admin.unhideProfile'],
  ['sheet-supporter', 'Supporter actions', 'mobile'],
  ['sheet-supporter', 'Extend sheet', 'mobile', 'Admin.replacePremium'],
  ['sheet-banned', 'Banned actions', 'mobile'],
]);
add(
  'moderation',
  'Moderation & bans',
  '/admin',
  'features-admin-moderationpage',
  [['dummy-data', 'Dummy data panel', 'desktop', 'Admin.tabDummy']],
);
add('moderation', 'Moderation & bans', '/admin', 'review-admin', [
  ['records', 'Single dismiss', 'desktop', '=Tomás Ruiz', 'Admin.dismiss'],
  ['records', 'Spam warning', 'desktop', 'Admin.warn', 'Admin.warnPresetSpam'],
  ['records', 'Hate warning', 'desktop', 'Admin.warn', 'Admin.warnPresetHate'],
  [
    'records',
    'Inappropriate warning',
    'desktop',
    'Admin.warn',
    'Admin.warnPresetInappropriate',
  ],
  [
    'records',
    'Impersonation warning',
    'desktop',
    'Admin.warn',
    'Admin.warnPresetImpersonation',
  ],
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
add(
  'settings',
  'Settings & Supporter',
  '/settings',
  'features-settings-settingspage',
  [
    ['restored-draft', 'Restored draft', 'desktop'],
    ['supporter-tab-supporter', 'Supporter overview', 'desktop'],
    ['supporter-granted', 'Complimentary Supporter', 'desktop'],
  ],
);
add('settings', 'Settings & Supporter', '/settings', 'review-settings', [
  ['unlisted', 'Unlisted overview', 'mobile'],
  ['unlisted', 'Supporter privacy', 'mobile', 'Settings.privacyTitle'],
  [
    'unlisted',
    'Supporter notifications',
    'mobile',
    'Settings.notificationsTitle',
  ],
  [
    'unlisted',
    'Push denied',
    'mobile',
    'Settings.notificationsTitle',
    'Settings.pushNotificationsLabel',
    '?Settings.pushPermissionDenied',
  ],
  ['unlisted', 'Delete account', 'mobile', 'Settings.deleteAccountLabel'],
  ['exporting', 'Export running', 'mobile', 'Settings.exportDataLabel'],
  ['exported', 'Export done', 'mobile', 'Settings.exportDataLabel'],
  ['export-failed', 'Export failed', 'mobile', 'Settings.exportDataLabel'],
  [
    'owner',
    'Reload prompt',
    'mobile',
    'Settings.devTitle',
    'Settings.loadTracingLabel',
  ],
]);

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
add('saved', 'Saved & blocking', '/saved', 'review-settings', [
  ['nothing-saved', 'Nothing saved', 'desktop'],
]);
add('saved', 'Saved & blocking', '/saved', 'routes-saved', [
  [
    'search-filter-and-sort',
    'No matching saves',
    'desktop',
    'input <- zzzz',
    '?Saved.noMatchesDescription',
  ],
]);
add(
  'saved',
  'Saved & blocking',
  '/settings#privacy',
  'features-settings-blockedusers',
  [
    [
      'default',
      'No matching accounts',
      'desktop',
      'input <- zzzz',
      '?Settings.blockedUsersNoMatches',
    ],
    ['default', 'Unblock dialog', 'desktop', 'Settings.unblockUser'],
  ],
);
add('saved', 'Saved & blocking', '/saved', 'features-settings-settingspage', [
  [
    'mobile-blocked-accounts',
    'Blocked accounts page',
    'mobile',
    'Settings.privacyTitle',
    'Settings.blockedUsersTitle',
  ],
]);

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
  'navigation',
  'Navigation & shared controls',
  '/',
  'components-form-searchfield',
  [['filled', 'Search field', 'mobile']],
);
add('navigation', 'Navigation & shared controls', '/', 'review-general', [
  ['drafts', 'Draft notices', 'desktop'],
  ['metadata', 'Page description', 'desktop'],
  [
    'draft-confirmation',
    'Unsaved changes confirmation',
    'desktop',
    'input[name="value"] <- Draft edited',
    '?form[data-draft-unavailable]',
    'a[href="/review-draft"]',
  ],
  ['legal-fallback', 'Untranslated legal page', 'desktop'],
  [
    'language-save-failed',
    'Language save error',
    'desktop',
    'LanguageSwitcher.changeLanguage',
    'a:not([aria-current])',
    '?LanguageSwitcher.saveError',
  ],
  ['menu-cooldown', 'Account menu cooldown', 'desktop', 'UserMenu.accountMenu'],
]);
add(
  'navigation',
  'Navigation & shared controls',
  '/',
  'navigation-mobiledock',
  [['bump-cooling-down', 'Dock cooldown', 'mobile', 'Navigation.dockYourCard']],
);
add(
  'navigation',
  'Navigation & shared controls',
  '/',
  'components-datepicker',
  [
    [
      'activity-rings',
      'Date picker activity',
      'desktop',
      'button[aria-haspopup="dialog"]',
    ],
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
add('analytics', 'Analytics & diagnostics', '/analytics', 'review-general', [
  ['rare-events', 'Rare events', 'desktop'],
  ['refresh-trace', 'Refresh trace', 'desktop', 'LoadTrace.history'],
]);
add('analytics', 'Analytics & diagnostics', '/analytics', 'review-general', [
  ['copy-failed-trace', 'Copy failure', 'desktop', 'LoadTrace.copy'],
]);

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

export type SceneIndex = Observation & {
  actions: string[];
  scope: string;
};

export type Catalogue = {
  scenes: Record<string, Partial<Record<Locale, SceneIndex>>>;
  errors: { scene: string; locale: Locale; reason: string }[];
};

export function indexPlacements(catalogue: Catalogue) {
  const placements = new Map<string, Placement>();
  for (const [sceneId, observations] of Object.entries(catalogue.scenes)) {
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

export function outstanding(
  review: Review,
  finding: Finding,
  placements: Placement[],
) {
  if (finding.noteOnly) return [];
  return locales
    .filter((locale) => !verified(review, finding, locale))
    .map((locale) => ({
      locale,
      reason: placements.some(({ rendered }) => rendered[locale])
        ? 'Needs review'
        : 'Unmapped placement',
    }));
}

export function sectionPending(
  review: Review,
  section: Section,
  findings: Finding[],
  placements: Map<string, Placement[]>,
) {
  return findings.some((finding) => {
    const known = placements.get(finding.key) ?? [];
    const belongs =
      findingSection(finding) === section.id ||
      known.some(({ scene }) => scene.sectionId === section.id);
    return belongs && outstanding(review, finding, known).length > 0;
  });
}
