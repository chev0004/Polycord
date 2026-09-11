export type NotificationKind = 'copy' | 'view' | 'warning';

export type Notification = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorAvatarUrl?: string;
  isGuest?: boolean;
  timestamp?: string;
  createdAt?: string;
};

export type Notifications = Notification[];
