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
  last?: boolean;
  onMarkAsRead: () => void;
  onDelete: () => void;
} & HTMLAttributes<HTMLDivElement>;

const linkClassName =
  'self-start text-[13px] text-primary-lighter leading-[1.35] underline decoration-[rgba(229,238,247,0.5)] underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:text-foreground';

const actionClassName =
  'flex h-[30px] w-[30px] items-center justify-center rounded-row text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-foreground focus-visible:bg-white/[0.06] focus-visible:text-foreground disabled:opacity-40';

export const getNotificationMessage = (
  notification: Notification,
  premium: boolean,
  t: ReturnType<typeof useTranslations<'Inbox'>>,
) => {
  if (notification.kind === 'warning') return t('moderationWarning');

  if (notification.kind === 'share') {
    if (!premium) return t('anonymousShareAlert');
    return notification.actorName
      ? t('userShared', { user: notification.actorName })
      : t(notification.isGuest ? 'guestShared' : 'anonymousUserShared');
  }

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
  last = false,
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
      className={`InboxRow relative flex items-center gap-3 rounded-row bg-background-main py-3 pr-2 pl-[18px] text-foreground transition-colors duration-150 hover:bg-[#1f2022] ${last ? 'rounded-b-[14px]' : ''} ${className}`}
    >
      {notification.read ? null : (
        <span
          role="img"
          aria-label={t('unread')}
          className="-mt-[3px] absolute top-1/2 left-1.5 h-1.5 w-1.5 rounded-full bg-primary-light"
        />
      )}

      <span
        className={`flex-shrink-0 transition-opacity duration-150 ${notification.read ? 'opacity-60' : ''}`}
      >
        <Avatar avatarUrl={avatarUrl} size="sm" />
      </span>

      <div
        className={`flex min-w-0 flex-1 flex-col gap-0.5 transition-opacity duration-150 ${notification.read ? 'opacity-60' : ''}`}
      >
        <p className="break-words font-medium text-[15px] leading-[1.3] [text-wrap:pretty]">
          {message}
        </p>
        {notification.kind === 'warning' ? (
          <Link href={`/${locale}/legal/guidelines`} className={linkClassName}>
            {t('reviewGuidelines')}
          </Link>
        ) : premium && notification.actorProfileId ? (
          <Link
            href={`/${locale}/u/${notification.actorProfileId}`}
            className={linkClassName}
          >
            {t('viewProfile')}
          </Link>
        ) : premium && !notification.isGuest ? (
          <p className="text-muted text-xs leading-[1.35]">
            {t('profileUnavailable')}
          </p>
        ) : null}
        <span className="block text-muted text-xs leading-[1.35]">
          {notification.timestamp}
        </span>
      </div>

      <div className="flex flex-shrink-0 gap-0.5">
        <button
          type="button"
          onClick={onMarkAsRead}
          disabled={disabled}
          className={actionClassName}
          title={notification.read ? t('markAsUnread') : t('markAsRead')}
        >
          {notification.read ? (
            <MdOutlineMarkEmailUnread size={20} />
          ) : (
            <MdOutlineMarkEmailRead size={20} />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className={actionClassName}
          title={t('delete')}
        >
          <MdClose size={20} />
        </button>
      </div>
    </div>
  );
};
