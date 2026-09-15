import 'server-only';

import { and, desc, eq, gte, isNull, lt, notExists, or } from 'drizzle-orm';
import { sendPushForNotification } from '@/lib/push/server';
import { db } from './client';
import {
  type NewNotificationRecord,
  notifications,
  profiles,
  userBlocks,
  users,
} from './schema';
import { getUserSettingsByUserId } from './settings';

export const listNotificationsForUser = async (userId: string) =>
  db
    .select({
      notification: notifications,
      actorProfileId: profiles.id,
    })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorUserId))
    .leftJoin(
      profiles,
      and(
        eq(profiles.userId, users.id),
        eq(profiles.isPublic, true),
        eq(profiles.hiddenByModeration, false),
        isNull(users.bannedAt),
        or(isNull(users.suspendedUntil), lt(users.suspendedUntil, new Date())),
        notExists(
          db
            .select({ id: userBlocks.id })
            .from(userBlocks)
            .where(
              or(
                and(
                  eq(userBlocks.blockerUserId, userId),
                  eq(userBlocks.blockedUserId, users.id),
                ),
                and(
                  eq(userBlocks.blockerUserId, users.id),
                  eq(userBlocks.blockedUserId, userId),
                ),
              ),
            ),
        ),
      ),
    )
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id));

export const createNotification = async (values: NewNotificationRecord) => {
  const settings = await getUserSettingsByUserId(values.userId);
  if (values.kind === 'copy' && settings?.profileInteractionAlert === false)
    return null;
  if (values.kind === 'view' && !settings?.profileViewAlert) return null;
  const [created] = await db.insert(notifications).values(values).returning();
  try {
    await sendPushForNotification(created);
  } catch (error) {
    console.error('Notification push delivery failed', error);
  }

  return created;
};

export const hasRecentViewNotification = async (
  userId: string,
  actorUserId: string | null,
  windowStart: Date,
): Promise<boolean> => {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.kind, 'view'),
        actorUserId === null
          ? eq(notifications.isGuest, true)
          : eq(notifications.actorUserId, actorUserId),
        gte(notifications.createdAt, windowStart),
      ),
    )
    .limit(1);

  return existing !== undefined;
};

export const setNotificationRead = async (
  userId: string,
  notificationId: string,
  read: boolean,
) => {
  await db
    .update(notifications)
    .set({ read })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    );
};

export const markAllNotificationsRead = async (userId: string) => {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
};

export const deleteNotification = async (
  userId: string,
  notificationId: string,
) => {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    );
};

export const clearNotifications = async (userId: string) => {
  await db.delete(notifications).where(eq(notifications.userId, userId));
};
