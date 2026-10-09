export type NotificationKind = 'copy' | 'view' | 'warning' | 'share';

export const WARNING_CATEGORIES = [
  'spam',
  'harassment',
  'hate',
  'inappropriate',
  'impersonation',
  'privacy',
] as const;

export type WarningCategory = (typeof WARNING_CATEGORIES)[number];

export type Notification = {
  id: string;
  kind: NotificationKind;
  actorName?: string;
  actorAvatarUrl?: string;
  actorProfileId?: string;
  isGuest?: boolean;
  message?: string;
  warningCategory?: WarningCategory;
  acknowledgedAt?: string;
  timestamp?: string;
  createdAt?: string;
};

export type Notifications = Notification[];

export const hasNotice = ({ kind }: Pick<Notification, 'kind'>) =>
  kind === 'warning';

export const isNoticePending = (
  notification: Pick<Notification, 'kind' | 'acknowledgedAt'>,
) => hasNotice(notification) && notification.acknowledgedAt === undefined;
