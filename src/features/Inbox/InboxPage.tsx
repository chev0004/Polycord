'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  MdDeleteOutline,
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
  MdOutlinePersonOutline,
  MdOutlineShield,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ActionSheet, type ActionSheetItem } from '@/components/Sheet';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import type { Notifications } from '@/types';
import { getNotificationMessage } from './NotificationEntry';
import { formatRelativeTime, useInbox } from './useInbox';

const rowClassName =
  'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-overlay focus-visible:bg-overlay active:bg-overlay';

export const InboxPage = ({
  notifications: initialNotifications = [],
  premium = false,
  persist = true,
}: {
  notifications?: Notifications;
  premium?: boolean;
  persist?: boolean;
}) => {
  const t = useTranslations('Inbox');
  const locale = useLocale();
  const router = useRouteProgressRouter();
  const inbox = useInbox({
    notifications: initialNotifications,
    premium,
    persist,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const active = inbox.notifications.find((n) => n.id === activeId);

  const openNotification = (id: string, read: boolean) => {
    setActiveId(id);
    setOpen(true);
    if (!read) void inbox.setRead(id, true);
  };

  const link = active
    ? active.kind === 'warning'
      ? {
          icon: MdOutlineShield,
          label: t('reviewGuidelines'),
          href: `/${locale}/legal/guidelines`,
        }
      : inbox.premium && active.actorProfileId
        ? {
            icon: MdOutlinePersonOutline,
            label: t('viewProfile'),
            href: `/${locale}/u/${active.actorProfileId}`,
          }
        : null
    : null;

  const actions: ActionSheetItem[] = active
    ? [
        ...(link
          ? [
              {
                key: 'link',
                icon: link.icon,
                label: link.label,
                onSelect: () => router.push(link.href),
              },
            ]
          : []),
        {
          key: 'read',
          icon: active.read ? MdOutlineMarkEmailUnread : MdOutlineMarkEmailRead,
          label: active.read ? t('markAsUnread') : t('markAsRead'),
          disabled: inbox.pending,
          onSelect: () => void inbox.setRead(active.id, !active.read),
        },
        {
          key: 'delete',
          icon: MdDeleteOutline,
          label: t('delete'),
          danger: true,
          disabled: inbox.pending,
          onSelect: () => void inbox.remove(active.id),
        },
      ]
    : [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col font-figtree">
      <div className="flex min-h-[52px] items-center justify-between gap-3 pt-1 pr-3 pb-2 pl-4">
        <h1 className="font-bold text-[28px] leading-tight tracking-[-0.01em]">
          {t('title')}
        </h1>
        <button
          type="button"
          onClick={() => void inbox.markAllRead()}
          disabled={inbox.pending || inbox.unreadCount === 0}
          className="h-11 flex-shrink-0 px-2 font-semibold text-primary text-sm hover:text-primary-light focus-visible:text-primary-light disabled:text-subtle"
        >
          {t('markAllRead')}
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8">
        {inbox.error ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-3xl bg-background-dark p-4 text-danger text-sm"
          >
            <p>{t(inbox.error)}</p>
            <Button onClick={inbox.retry}>{t('retry')}</Button>
          </div>
        ) : null}

        {inbox.loading ? (
          <output className="px-1 py-4 text-muted text-sm">
            {t('loading')}
          </output>
        ) : inbox.notifications.length > 0 ? (
          <ul className="overflow-hidden rounded-3xl bg-background-dark">
            {inbox.notifications.map((notification, index) => (
              <li
                key={notification.id}
                className="relative animate-[fadeInUp_0.3s_ease-out_both] before:absolute before:top-0 before:right-0 before:left-[60px] before:h-px before:bg-line first:before:hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  type="button"
                  onClick={() =>
                    openNotification(notification.id, notification.read)
                  }
                  className={rowClassName}
                >
                  <Avatar
                    avatarUrl={
                      inbox.premium ? notification.actorAvatarUrl : undefined
                    }
                    size="sm"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span
                      className={`break-words text-sm leading-snug ${notification.read ? '' : 'font-semibold'}`}
                    >
                      {getNotificationMessage(notification, inbox.premium, t)}
                    </span>
                    <span className="text-muted text-xs">
                      {notification.createdAt
                        ? formatRelativeTime(notification.createdAt, t)
                        : notification.timestamp}
                    </span>
                  </span>
                  {notification.read ? null : (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary">
                      <span className="sr-only">{t('unread')}</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : inbox.error ? null : (
          <div className="flex flex-col items-center gap-2.5 rounded-3xl bg-background-dark px-5 py-8 text-center">
            <h2 className="font-bold text-lg">{t('noNotifications')}</h2>
            <p className="text-muted text-sm leading-normal">
              {t('noNotificationsDescription')}
            </p>
          </div>
        )}

        {!inbox.loading && !inbox.premium ? (
          <Link
            href={`/${locale}/settings#premium`}
            className={`${rowClassName} overflow-hidden rounded-3xl bg-background-dark`}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold text-[15px] text-primary-light">
                {t('seeWhoWithPremium')}
              </span>
              <span className="text-[13px] text-subtle leading-snug">
                {t('premiumUpsellDescription')}
              </span>
            </span>
          </Link>
        ) : null}

        {inbox.notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => void inbox.clearAll()}
            disabled={inbox.pending}
            className={`${rowClassName} rounded-3xl bg-background-dark font-semibold text-[15px] text-danger disabled:opacity-50`}
          >
            <MdDeleteOutline size={22} aria-hidden />
            {t('clearAll')}
          </button>
        ) : null}
      </div>

      <ActionSheet
        open={open && Boolean(active)}
        onOpenChange={setOpen}
        title={active ? getNotificationMessage(active, inbox.premium, t) : null}
        items={actions}
      />
    </main>
  );
};
