export type NotificationKind = 'copy' | 'view';

export type Notification = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorAvatarUrl?: string;
  isGuest?: boolean;
  timestamp: string;
};

export type Notifications = Notification[];
