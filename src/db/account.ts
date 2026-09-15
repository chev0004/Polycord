import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { db } from './client';
import { mapProfileAvailability } from './profiles';
import {
  analyticsEvents,
  notifications,
  profileBoosts,
  profiles,
  profileTargetLanguages,
  pushSubscriptions,
  reports,
  savedProfiles,
  subscriptions,
  userBlocks,
  userSettings,
  users,
} from './schema';
import { getVoiceIntroByUserId } from './voiceIntros';

export const getAccountExportByUserId = async (userId: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const targetLanguages = profile
    ? await db
        .select({
          language: profileTargetLanguages.language,
          level: profileTargetLanguages.proficiencyLevel,
        })
        .from(profileTargetLanguages)
        .where(eq(profileTargetLanguages.profileId, profile.id))
        .orderBy(asc(profileTargetLanguages.position))
    : [];

  const [
    settings,
    saved,
    blocks,
    filedReports,
    inbox,
    billing,
    boosts,
    push,
    analytics,
  ] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)),
    db.select().from(savedProfiles).where(eq(savedProfiles.userId, user.id)),
    db.select().from(userBlocks).where(eq(userBlocks.blockerUserId, user.id)),
    db
      .select({
        id: reports.id,
        reportedProfileId: reports.reportedProfileId,
        reason: reports.reason,
        details: reports.details,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.reporterUserId, user.id)),
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        read: notifications.read,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select().from(profileBoosts).where(eq(profileBoosts.userId, user.id)),
    db
      .select({
        id: pushSubscriptions.id,
        createdAt: pushSubscriptions.createdAt,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id)),
    db
      .select({
        id: analyticsEvents.id,
        name: analyticsEvents.name,
        locale: analyticsEvents.locale,
        createdAt: analyticsEvents.createdAt,
      })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.userId, user.id)),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    voiceIntro: await getVoiceIntroByUserId(user.id),
    account: {
      id: user.id,
      discordUserId: user.discordUserId,
      discordUsername: user.discordUsername,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    profile: profile
      ? {
          id: profile.id,
          isPublic: profile.isPublic,
          allowAnonymousCopy: profile.allowAnonymousCopy,
          displayTimezone: profile.displayTimezone,
          displayAvailability: profile.displayAvailability,
          primaryLanguage: profile.primaryLanguage,
          targetLanguage: profile.targetLanguage,
          targetLanguages: targetLanguages.length
            ? targetLanguages
            : [
                {
                  language: profile.targetLanguage,
                  level: profile.proficiencyLevel,
                },
              ],
          proficiencyLevel: profile.proficiencyLevel,
          bio: profile.bio,
          availability: profile.availability,
          availabilityDays: profile.availabilityDays,
          availabilityFrom: profile.availabilityFrom,
          availabilityTo: profile.availabilityTo,
          availabilityAnyTime: profile.availabilityAnyTime,
          availabilityWindow: mapProfileAvailability(profile) ?? null,
          tags: profile.tags,
          country: profile.country,
          timezone: profile.timezone,
          cardColor: profile.cardColor,
          customGradientFrom: profile.customGradientFrom,
          customGradientTo: profile.customGradientTo,
          accentOverride: profile.accentOverride,
          lastBumpedAt: profile.lastBumpedAt,
          boostedUntil: profile.boostedUntil,
          voiceIntroSeconds: profile.voiceIntroSeconds,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        }
      : null,
    settings: settings[0] ?? null,
    savedProfiles: saved,
    blocks,
    reportsFiled: filedReports,
    notifications: inbox,
    subscription: billing[0] ?? null,
    profileBoosts: boosts,
    pushSubscriptions: push,
    analyticsEvents: analytics,
    excluded:
      "Other people's account data, notification actor identities, reports filed by others, internal moderation and abuse records, analytics metadata, and push delivery endpoints and keys are excluded.",
    retention: {
      deleted:
        'Account, profile, target languages, settings, voice introduction, saved-profile links, blocks, reports involving the account, inbox notifications, local subscription mapping, boosts, and push subscriptions are deleted.',
      retainedAfterDeletion:
        'Analytics events, moderation actions, and suspicious-activity logs remain with account links cleared. Their metadata, notes, anonymous identifiers, or IP addresses can remain. Rate-limit counters, Discord-keyed moderation restrictions, actor names and avatars already recorded in other inboxes, and payment-provider records are not deleted by this operation. This operation does not purge backups.',
      sessions:
        'Existing sessions stop authorizing requests. A deliberate Discord sign-in can create a new account without restoring deleted data; retained moderation restrictions still apply.',
      discord:
        'Deleting Polycord data does not delete your Discord account or revoke Discord authorization. Remove Polycord in Discord User Settings > Authorized Apps to revoke that authorization.',
    },
  };
};

export const deleteAccountByUserId = async (userId: string) => {
  const deletedUsers = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return deletedUsers.length > 0;
};
