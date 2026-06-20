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
    primaryLanguage: varchar('primary_language', { length: 16 }).notNull(),
    targetLanguage: varchar('target_language', { length: 16 }).notNull(),
    proficiencyLevel: proficiencyLevelEnum('proficiency_level').notNull(),
    bio: text('bio').notNull(),
    availability: varchar('availability', { length: 32 })
      .default('flexible')
      .notNull(),
    tags: text('tags').array().default(sql`'{}'::text[]`).notNull(),
    country: varchar('country', { length: 2 }),
    timezone: varchar('timezone', { length: 64 }),
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
    check(
      'profiles_bio_length_check',
      sql`char_length(${table.bio}) between 10 and 500`,
    ),
    check(
      'profiles_availability_check',
      sql`${table.availability} in ('weeknights', 'weekends', 'weekday_mornings', 'flexible')`,
    ),
    check('profiles_tags_limit_check', sql`cardinality(${table.tags}) <= 6`),
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
