'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import {
  MdExplore,
  MdInbox,
  MdOutlineExplore,
  MdOutlineInbox,
  MdOutlineSettings,
  MdSettings,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { useInbox } from '@/features/Inbox';

type DockTab = 'discover' | 'inbox' | 'settings' | 'profile';

type MobileDockProps = {
  locale: string;
  userAvatarUrl?: string;
  onNavigate: (href: string) => void;
};

const routeTab = (route: string): DockTab | null => {
  if (route === '') return 'discover';
  if (route.startsWith('/inbox')) return 'inbox';
  if (route.startsWith('/settings')) return 'settings';
  if (route.startsWith('/profile') || route.startsWith('/saved'))
    return 'profile';
  return null;
};

const dockButtonClassName = (on: boolean) =>
  `relative flex h-12 w-12 items-center justify-center rounded-full transition-[color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.92] ${
    on ? 'text-on-primary' : 'text-muted focus-visible:text-foreground'
  }`;

const surfaceClassName =
  'flex items-center gap-1 rounded-full bg-background-darker p-[5px] shadow-[0_0_0_1px_var(--color-line-strong),0_14px_30px_-6px_rgba(0,0,0,0.7)]';

export const MobileDock = ({
  locale,
  userAvatarUrl,
  onNavigate,
}: MobileDockProps) => {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const { unreadCount } = useInbox({ notifications: [] });
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    stretch: boolean;
  } | null>(null);
  const [tip, setTip] = useState<DockTab | null>(null);
  const items = useRef<Partial<Record<DockTab, HTMLElement | null>>>({});
  const previous = useRef<{ left: number; width: number } | null>(null);

  const tab = routeTab(pathname.slice(locale.length + 1));

  useLayoutEffect(() => {
    const element = tab ? items.current[tab] : null;
    if (!element) {
      previous.current = null;
      setIndicator(null);
      return;
    }

    const to = { left: element.offsetLeft, width: element.offsetWidth };
    const from = previous.current;
    previous.current = to;

    if (!from || from.left === to.left) {
      setIndicator({ ...to, stretch: false });
      return;
    }

    const left = Math.min(from.left, to.left);
    const right = Math.max(from.left + from.width, to.left + to.width);
    setIndicator({ left, width: right - left, stretch: true });
    setTip(tab);
    const settle = setTimeout(
      () => setIndicator({ ...to, stretch: false }),
      170,
    );
    const hide = setTimeout(
      () => setTip((current) => (current === tab ? null : current)),
      1300,
    );

    return () => {
      clearTimeout(settle);
      clearTimeout(hide);
    };
  }, [tab]);

  const labels: Record<DockTab, string> = {
    discover: t('dockDiscover'),
    inbox: t('dockInbox'),
    settings: t('dockSettings'),
    profile: t('dockYourCard'),
  };

  const tipBubble = (id: DockTab) => (
    <span
      aria-hidden
      className={`-translate-x-1/2 pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-[5px] font-bold text-on-primary text-xs transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        tip === id ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
      }`}
    >
      {labels[id]}
    </span>
  );

  const dockButton = (
    id: DockTab,
    onClick: () => void,
    icon: ReactNode,
    label = labels[id],
  ) => (
    <button
      ref={(element) => {
        items.current[id] = element;
      }}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={tab === id ? 'page' : undefined}
      className={`z-[2] ${dockButtonClassName(tab === id)}`}
    >
      {icon}
      {tipBubble(id)}
    </button>
  );

  return (
    <nav
      aria-label={t('dockLabel')}
      className="-translate-x-1/2 fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 z-40 flex items-center gap-3 font-figtree"
    >
      {indicator ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute top-[5px] z-[1] h-12 rounded-full bg-primary ease-[cubic-bezier(0.16,1,0.3,1)] ${
            indicator.stretch
              ? 'scale-y-[0.82] transition-[left,width,transform] duration-[170ms]'
              : 'transition-[left,width,transform] duration-[340ms]'
          }`}
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      <div className={surfaceClassName}>
        {dockButton(
          'discover',
          () => onNavigate(`/${locale}`),
          tab === 'discover' ? (
            <MdExplore size={24} />
          ) : (
            <MdOutlineExplore size={24} />
          ),
        )}
      </div>
      <div className={surfaceClassName}>
        {dockButton(
          'inbox',
          () => onNavigate(`/${locale}/inbox`),
          <>
            {tab === 'inbox' ? (
              <MdInbox size={24} />
            ) : (
              <MdOutlineInbox size={24} />
            )}
            {unreadCount > 0 ? (
              <span
                className={`absolute top-1.5 right-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-discord-blue px-[5px] font-bold text-[10px] text-white ring-2 ${
                  tab === 'inbox' ? 'ring-primary' : 'ring-background-darker'
                }`}
              >
                {unreadCount}
              </span>
            ) : null}
          </>,
          unreadCount > 0
            ? t('dockInboxUnread', { count: unreadCount })
            : labels.inbox,
        )}
        {dockButton(
          'settings',
          () => onNavigate(`/${locale}/settings`),
          tab === 'settings' ? (
            <MdSettings size={24} />
          ) : (
            <MdOutlineSettings size={24} />
          ),
        )}
        {dockButton(
          'profile',
          () => onNavigate(`/${locale}/profile`),
          <span
            className={`rounded-full transition-shadow duration-300 ${
              tab === 'profile' ? 'ring-2 ring-primary' : ''
            }`}
          >
            <Avatar avatarUrl={userAvatarUrl} size="sm" />
          </span>,
        )}
      </div>
    </nav>
  );
};
