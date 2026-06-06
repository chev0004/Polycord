import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
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
    check('profiles_tags_limit_check', sql`cardinality(${table.tags}) <= 6`),
  ],
);

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
