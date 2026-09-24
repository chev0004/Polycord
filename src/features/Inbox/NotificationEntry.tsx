import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { HTMLAttributes } from 'react';
import {
  MdClose,
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import type { Notification } from '@/types';

type NotificationEntryProps = {
  notification: Notification & { read: boolean };
  premium?: boolean;
  disabled?: boolean;
  onMarkAsRead: () => void;
  onDelete: () => void;
} & HTMLAttributes<HTMLDivElement>;

const getNotificationMessage = (
  notification: Notification,
  premium: boolean,
  t: ReturnType<typeof useTranslations<'Inbox'>>,
) => {
  if (notification.kind === 'warning') return t('moderationWarning');

  if (!premium) return t('anonymousCopyAlert');

  if (notification.kind === 'view') {
    return notification.actorName
      ? t('userViewed', { user: notification.actorName })
      : t(notification.isGuest ? 'guestViewed' : 'anonymousUserViewed');
  }

  return notification.actorName
    ? t('userCopied', { user: notification.actorName })
    : t('anonymousUserCopied');
};

export const NotificationEntry: React.FC<NotificationEntryProps> = ({
  notification,
  premium = false,
  disabled = false,
  onMarkAsRead,
  onDelete,
  className,
  style,
  ...props
}) => {
  const t = useTranslations('Inbox');
  const locale = useLocale();
  const avatarUrl = premium ? notification.actorAvatarUrl : undefined;
  const message = getNotificationMessage(notification, premium, t);

  return (
    <div
      {...props}
      style={style}
      className={`relative flex items-center gap-3 rounded-md bg-background-main p-3 text-foreground transition-opacity ${notification.read ? 'opacity-60' : 'opacity-100'} ${className}`}
    >
      <span
        className={`-left-1 absolute h-2 w-2 flex-shrink-0 rounded-full bg-primary transition-opacity duration-300 ${
          notification.read ? 'opacity-0' : 'opacity-100'
        }`}
      />

      <Avatar avatarUrl={avatarUrl} size="sm" />

      <div className="flex-grow overflow-hidden">
        <p className="break-words text-sm">{message}</p>
        {notification.kind === 'warning' ? (
          <Link
            href={`/${locale}/legal/guidelines`}
            className="text-primary-light text-xs underline focus-visible:bg-background-darker"
          >
            {t('reviewGuidelines')}
          </Link>
        ) : premium && notification.actorProfileId ? (
          <Link
            href={`/${locale}/u/${notification.actorProfileId}`}
            className="text-primary-light text-xs underline focus-visible:bg-background-darker"
          >
            {t('viewProfile')}
          </Link>
        ) : premium ? (
          <p className="text-muted text-xs">
            {t(
              notification.isGuest ? 'anonymousProfile' : 'profileUnavailable',
            )}
          </p>
        ) : null}
        <span className="block text-muted text-xs">
          {notification.timestamp}
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center">
        <button
          type="button"
          onClick={onMarkAsRead}
          disabled={disabled}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-background-darker hover:text-foreground focus-visible:bg-background-darker focus-visible:text-foreground disabled:opacity-40"
          title={notification.read ? t('markAsUnread') : t('markAsRead')}
        >
          {notification.read ? (
            <MdOutlineMarkEmailRead size={18} />
          ) : (
            <MdOutlineMarkEmailUnread size={18} />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-background-darker hover:text-foreground focus-visible:bg-background-darker focus-visible:text-foreground disabled:opacity-40"
          title={t('delete')}
        >
          <MdClose size={18} />
        </button>
      </div>
    </div>
  );
};
