import type { NotificationKind } from '@/types';

export type StoredNotification = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorAvatarUrl?: string;
  actorProfileId?: string;
  isGuest?: boolean;
  read: boolean;
  createdAt: string;
};

const ENDPOINT = '/api/notifications';

const jsonRequest = async (method: string, body: unknown) => {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Notification request failed: ${method}`);
  }
};

export const fetchNotifications = async (
  signal?: AbortSignal,
): Promise<{
  notifications: StoredNotification[];
  premium: boolean;
}> => {
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(ENDPOINT, {
    cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) {
    throw new Error(`Notification request failed: ${response.status}`);
  }
  return response.json();
};

export const setNotificationReadRequest = (id: string, read: boolean) =>
  jsonRequest('PATCH', { id, read });

export const markAllNotificationsReadRequest = () =>
  jsonRequest('PATCH', { all: true });

export const deleteNotificationRequest = (id: string) =>
  jsonRequest('DELETE', { id });

export const clearNotificationsRequest = () =>
  jsonRequest('DELETE', { all: true });

export const notifyUsernameCopied = (profileId: string) =>
  jsonRequest('POST', { profileId });
