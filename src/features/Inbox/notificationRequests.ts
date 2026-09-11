import type { NotificationKind } from '@/types';

export type StoredNotification = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorAvatarUrl?: string;
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
  });

  if (!response.ok) {
    throw new Error(`Notification request failed: ${method}`);
  }
};

export const fetchNotifications = async (): Promise<StoredNotification[]> => {
  try {
    const response = await fetch(ENDPOINT);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      notifications?: StoredNotification[];
    };

    return data.notifications ?? [];
  } catch {
    return [];
  }
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
