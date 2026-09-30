export type NotificationKind = 'copy' | 'view' | 'warning' | 'share';

export type Notification = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorAvatarUrl?: string;
  actorProfileId?: string;
  isGuest?: boolean;
  timestamp?: string;
  createdAt?: string;
};

export type Notifications = Notification[];
