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

export const NOTICE_CATEGORIES: readonly WarningCategory[] = ['harassment'];

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

export const hasNotice = ({
  kind,
  warningCategory,
}: Pick<Notification, 'kind' | 'warningCategory'>) =>
  kind === 'warning' &&
  warningCategory !== undefined &&
  NOTICE_CATEGORIES.includes(warningCategory);

export const isNoticePending = (
  notification: Pick<
    Notification,
    'kind' | 'warningCategory' | 'acknowledgedAt'
  >,
) => hasNotice(notification) && notification.acknowledgedAt === undefined;
