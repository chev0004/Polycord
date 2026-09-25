import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const proficiencyLevelEnum = pgEnum('proficiency_level', [
  'beginner',
  'intermediate',
  'advanced',
  'native-level',
]);

export const themeEnum = pgEnum('theme', ['dark', 'light']);

export const timeFormatEnum = pgEnum('time_format', ['12hr', '24hr']);

export const languageDisplayEnum = pgEnum('language_display', [
  'long',
  'short',
]);

export const notificationKindEnum = pgEnum('notification_kind', [
  'copy',
  'view',
  'warning',
]);

export const moderationActionEnum = pgEnum('moderation_action', [
  'dismiss',
  'warn',
  'hide_profile',
  'unhide_profile',
  'suspend',
  'unsuspend',
  'ban',
  'unban',
]);

export const reportReasonEnum = pgEnum('report_reason', [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'other',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'pending',
  'reviewed',
  'dismissed',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    discordUserId: varchar('discord_user_id', { length: 32 }).notNull(),
    discordUsername: varchar('discord_username', { length: 64 }).notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    email: text('email'),
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('users_discord_user_id_idx').on(table.discordUserId),
    index('users_display_name_idx').on(table.displayName),
    index('users_display_name_trgm_idx').using(
      'gin',
      sql`lower(${table.displayName}) gin_trgm_ops`,
    ),
    index('users_discord_username_trgm_idx').using(
      'gin',
      sql`lower(${table.discordUsername}) gin_trgm_ops`,
    ),
  ],
);

export const moderationRestrictions = pgTable('moderation_restrictions', {
  discordUserId: varchar('discord_user_id', { length: 32 }).primaryKey(),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
  hiddenByModeration: boolean('hidden_by_moderation').default(false).notNull(),
});

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isPublic: boolean('is_public').default(false).notNull(),
    hiddenByModeration: boolean('hidden_by_moderation')
      .default(false)
      .notNull(),
    allowAnonymousCopy: boolean('allow_anonymous_copy').default(true).notNull(),
    displayTimezone: boolean('display_timezone').default(true).notNull(),
    displayAvailability: boolean('display_availability')
      .default(true)
      .notNull(),
    primaryLanguage: varchar('primary_language', { length: 16 }).notNull(),
    targetLanguage: varchar('target_language', { length: 16 }).notNull(),
    proficiencyLevel: proficiencyLevelEnum('proficiency_level').notNull(),
    bio: text('bio').notNull(),
    availability: varchar('availability', { length: 32 })
      .default('flexible')
      .notNull(),
    availabilityDays: varchar('availability_days', { length: 16 }),
    availabilityFrom: varchar('availability_from', { length: 5 }),
    availabilityTo: varchar('availability_to', { length: 5 }),
    availabilityAnyTime: boolean('availability_any_time')
      .default(false)
      .notNull(),
    tags: text('tags').array().default(sql`'{}'::text[]`).notNull(),
    cardColor: varchar('card_color', { length: 32 }),
    customGradientFrom: varchar('custom_gradient_from', { length: 7 }),
    customGradientTo: varchar('custom_gradient_to', { length: 7 }),
    accentOverride: varchar('accent_override', { length: 7 }),
    country: varchar('country', { length: 2 }),
    timezone: varchar('timezone', { length: 64 }),
    lastBumpedAt: timestamp('last_bumped_at', { withTimezone: true }),
    boostedUntil: timestamp('boosted_until', { withTimezone: true }),
    voiceIntroSeconds: integer('voice_intro_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('profiles_user_id_idx').on(table.userId),
    index('profiles_public_idx').on(table.isPublic),
    index('profiles_primary_language_idx').on(table.primaryLanguage),
    index('profiles_target_language_idx').on(table.targetLanguage),
    index('profiles_country_idx').on(table.country),
    index('profiles_timezone_idx').on(table.timezone),
    index('profiles_last_bumped_at_idx').on(
      table.lastBumpedAt.desc().nullsLast(),
    ),
    index('profiles_boosted_until_idx')
      .on(table.boostedUntil)
      .where(sql`${table.boostedUntil} is not null`),
    index('profiles_tags_idx').using('gin', table.tags),
    index('profiles_search_idx').using(
      'gin',
      sql`discovery_profile_text(${table.bio}, ${table.country}, ${table.tags}, ${table.displayTimezone}, ${table.timezone}) gin_trgm_ops`,
    ),
    check(
      'profiles_bio_length_check',
      sql`char_length(${table.bio}) between 10 and 500`,
    ),
    check(
      'profiles_availability_check',
      sql`${table.availability} in ('weeknights', 'weekends', 'weekday_mornings', 'flexible')`,
    ),
    check(
      'profiles_availability_days_check',
      sql`${table.availabilityDays} is null or ${table.availabilityDays} in ('any', 'weekdays', 'weekends')`,
    ),
    check(
      'profiles_availability_from_check',
      sql`${table.availabilityFrom} is null or ${table.availabilityFrom} ~ '^[0-2][0-9]:[0-5][0-9]$'`,
    ),
    check(
      'profiles_availability_to_check',
      sql`${table.availabilityTo} is null or ${table.availabilityTo} ~ '^[0-2][0-9]:[0-5][0-9]$'`,
    ),
    check('profiles_tags_limit_check', sql`cardinality(${table.tags}) <= 8`),
  ],
);

export const profileTargetLanguages = pgTable(
  'profile_target_languages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    language: varchar('language', { length: 16 }).notNull(),
    proficiencyLevel: proficiencyLevelEnum('proficiency_level').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    index('profile_target_languages_profile_id_idx').on(table.profileId),
    index('profile_target_languages_language_idx').on(table.language),
    uniqueIndex('profile_target_languages_profile_language_idx').on(
      table.profileId,
      table.language,
    ),
    uniqueIndex('profile_target_languages_profile_position_idx').on(
      table.profileId,
      table.position,
    ),
    check(
      'profile_target_languages_position_check',
      sql`${table.position} >= 0`,
    ),
  ],
);

export const savedProfiles = pgTable(
  'saved_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('saved_profiles_user_profile_idx').on(
      table.userId,
      table.profileId,
    ),
    index('saved_profiles_user_id_idx').on(table.userId),
    index('saved_profiles_profile_id_idx').on(table.profileId),
  ],
);

export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    theme: themeEnum('theme').default('dark').notNull(),
    applicationLanguage: varchar('application_language', { length: 16 })
      .default('en')
      .notNull(),
    timeFormat: timeFormatEnum('time_format').default('24hr').notNull(),
    languageDisplay: languageDisplayEnum('language_display')
      .default('long')
      .notNull(),
    activityStatus: boolean('activity_status').default(true).notNull(),
    pushNotifications: boolean('push_notifications').default(false).notNull(),
    matchAlert: boolean('match_alert').default(true).notNull(),
    profileInteractionAlert: boolean('profile_interaction_alert')
      .default(true)
      .notNull(),
    profileViewAlert: boolean('profile_view_alert').default(false).notNull(),
    hideProfileVisits: boolean('hide_profile_visits').default(false).notNull(),
    productAnalytics: boolean('product_analytics').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('user_settings_user_id_idx').on(table.userId)],
);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    anonymousId: varchar('anonymous_id', { length: 64 }),
    locale: varchar('locale', { length: 16 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('analytics_events_name_idx').on(table.name),
    index('analytics_events_created_at_idx').on(table.createdAt),
    index('analytics_events_user_id_idx').on(table.userId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: notificationKindEnum('kind').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorName: text('actor_name'),
    actorAvatarUrl: text('actor_avatar_url'),
    isGuest: boolean('is_guest').default(false).notNull(),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('notifications_user_id_created_at_idx').on(
      table.userId,
      table.createdAt.desc(),
    ),
    index('notifications_user_id_read_idx').on(table.userId, table.read),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterUserId: uuid('reporter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedProfileId: uuid('reported_profile_id').references(
      () => profiles.id,
      { onDelete: 'set null' },
    ),
    reason: reportReasonEnum('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('reports_reported_user_id_idx').on(table.reportedUserId),
    index('reports_reporter_user_id_idx').on(table.reporterUserId),
    index('reports_status_idx').on(table.status),
    check(
      'reports_details_length_check',
      sql`${table.details} is null or char_length(${table.details}) <= 1000`,
    ),
    check(
      'reports_no_self_report_check',
      sql`${table.reporterUserId} <> ${table.reportedUserId}`,
    ),
  ],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blockerUserId: uuid('blocker_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedUserId: uuid('blocked_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_blocks_blocker_blocked_idx').on(
      table.blockerUserId,
      table.blockedUserId,
    ),
    index('user_blocks_blocker_user_id_idx').on(table.blockerUserId),
    index('user_blocks_blocked_user_id_idx').on(table.blockedUserId),
    check(
      'user_blocks_no_self_block_check',
      sql`${table.blockerUserId} <> ${table.blockedUserId}`,
    ),
  ],
);

export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminUserId: uuid('admin_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reportId: uuid('report_id').references(() => reports.id, {
      onDelete: 'set null',
    }),
    action: moderationActionEnum('action').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('moderation_actions_created_at_idx').on(table.createdAt),
    index('moderation_actions_target_user_id_idx').on(table.targetUserId),
    check(
      'moderation_actions_note_length_check',
      sql`${table.note} is null or char_length(${table.note}) <= 500`,
    ),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 64 }).notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 64 }),
    status: varchar('status', { length: 32 }).default('none').notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('subscriptions_user_id_idx').on(table.userId),
    uniqueIndex('subscriptions_stripe_customer_id_idx').on(
      table.stripeCustomerId,
    ),
  ],
);

export const voiceIntros = pgTable(
  'voice_intros',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mimeType: varchar('mime_type', { length: 64 }).notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    data: text('data').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('voice_intros_user_id_idx').on(table.userId),
    check(
      'voice_intros_duration_check',
      sql`${table.durationSeconds} between 1 and 20`,
    ),
  ],
);

export const profileBoosts = pgTable(
  'profile_boosts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('profile_boosts_user_id_used_at_idx').on(table.userId, table.usedAt),
  ],
);

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
    index('push_subscriptions_user_id_idx').on(table.userId),
  ],
);

export const rateLimitCounters = pgTable(
  'rate_limit_counters',
  {
    scope: varchar('scope', { length: 32 }).notNull(),
    subject: varchar('subject', { length: 128 }).notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.subject] })],
);

export const suspiciousActivity = pgTable(
  'suspicious_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    action: varchar('action', { length: 32 }).notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ip: varchar('ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('suspicious_activity_created_at_idx').on(table.createdAt),
    index('suspicious_activity_user_id_idx').on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(profiles),
  savedProfiles: many(savedProfiles),
  settings: one(userSettings),
  notifications: many(notifications),
  reportsFiled: many(reports, { relationName: 'reporter' }),
  reportsReceived: many(reports, { relationName: 'reported' }),
  blocksCreated: many(userBlocks, { relationName: 'blocker' }),
  blocksReceived: many(userBlocks, { relationName: 'blocked' }),
}));

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  targetLanguages: many(profileTargetLanguages),
  savedBy: many(savedProfiles),
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const savedProfilesRelations = relations(savedProfiles, ({ one }) => ({
  user: one(users, {
    fields: [savedProfiles.userId],
    references: [users.id],
  }),
  profile: one(profiles, {
    fields: [savedProfiles.profileId],
    references: [profiles.id],
  }),
}));

export const profileTargetLanguagesRelations = relations(
  profileTargetLanguages,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileTargetLanguages.profileId],
      references: [profiles.id],
    }),
  }),
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterUserId],
    references: [users.id],
    relationName: 'reporter',
  }),
  reported: one(users, {
    fields: [reports.reportedUserId],
    references: [users.id],
    relationName: 'reported',
  }),
  profile: one(profiles, {
    fields: [reports.reportedProfileId],
    references: [profiles.id],
  }),
}));

export const suspiciousActivityRelations = relations(
  suspiciousActivity,
  ({ one }) => ({
    user: one(users, {
      fields: [suspiciousActivity.userId],
      references: [users.id],
    }),
  }),
);

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, {
    fields: [userBlocks.blockerUserId],
    references: [users.id],
    relationName: 'blocker',
  }),
  blocked: one(users, {
    fields: [userBlocks.blockedUserId],
    references: [users.id],
    relationName: 'blocked',
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ProfileTargetLanguage = typeof profileTargetLanguages.$inferSelect;
export type NewProfileTargetLanguage =
  typeof profileTargetLanguages.$inferInsert;
export type SavedProfile = typeof savedProfiles.$inferSelect;
export type NewSavedProfile = typeof savedProfiles.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type NotificationRecord = typeof notifications.$inferSelect;
export type NewNotificationRecord = typeof notifications.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type ReportReason = (typeof reportReasonEnum.enumValues)[number];
export type UserBlock = typeof userBlocks.$inferSelect;
export type NewUserBlock = typeof userBlocks.$inferInsert;
export type RateLimitCounter = typeof rateLimitCounters.$inferSelect;
export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;
export type ModerationActionKind =
  (typeof moderationActionEnum.enumValues)[number];
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type ProfileBoost = typeof profileBoosts.$inferSelect;
export type VoiceIntro = typeof voiceIntros.$inferSelect;
export type SuspiciousActivity = typeof suspiciousActivity.$inferSelect;
export type NewSuspiciousActivity = typeof suspiciousActivity.$inferInsert;

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;
