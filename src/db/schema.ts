import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
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

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    discordUserId: varchar('discord_user_id', { length: 32 }).notNull(),
    discordUsername: varchar('discord_username', { length: 64 }).notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('users_discord_user_id_idx').on(table.discordUserId)],
);

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isPublic: boolean('is_public').default(false).notNull(),
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
    country: varchar('country', { length: 2 }),
    timezone: varchar('timezone', { length: 64 }),
    lastBumpedAt: timestamp('last_bumped_at', { withTimezone: true }),
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
    index('profiles_last_bumped_at_idx').on(table.lastBumpedAt),
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

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(profiles),
  savedProfiles: many(savedProfiles),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ProfileTargetLanguage = typeof profileTargetLanguages.$inferSelect;
export type NewProfileTargetLanguage =
  typeof profileTargetLanguages.$inferInsert;
export type SavedProfile = typeof savedProfiles.$inferSelect;
export type NewSavedProfile = typeof savedProfiles.$inferInsert;
