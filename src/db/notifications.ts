import 'server-only';

import { and, desc, eq, gte } from 'drizzle-orm';
import { sendPushForNotification } from '@/lib/push/server';
import { db } from './client';
import {
  type NewNotificationRecord,
  type NotificationRecord,
  notifications,
} from './schema';

const missingNotificationsStorageCodes = new Set(['42P01', '42703']);

const getErrorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : null;

const getErrorCause = (error: unknown) =>
  error && typeof error === 'object' && 'cause' in error ? error.cause : null;

const isMissingNotificationsStorageError = (error: unknown): boolean => {
  let current: unknown = error;

  while (current) {
    const code = getErrorCode(current);

    if (code && missingNotificationsStorageCodes.has(code)) {
      return true;
    }

    current = getErrorCause(current);
  }

  return false;
};

export const listNotificationsForUser = async (
  userId: string,
): Promise<NotificationRecord[]> => {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    if (isMissingNotificationsStorageError(error)) {
      return [];
    }

    throw error;
  }
};

export const createNotification = async (values: NewNotificationRecord) => {
  const [created] = await db.insert(notifications).values(values).returning();
  await sendPushForNotification(created);

  return created;
};

export const hasRecentViewNotification = async (
  userId: string,
  actorName: string | null,
  windowStart: Date,
): Promise<boolean> => {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.kind, 'view'),
        actorName === null
          ? eq(notifications.isGuest, true)
          : eq(notifications.actorName, actorName),
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
