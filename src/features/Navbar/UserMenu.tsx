import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  MdArrowUpward,
  MdBookmarkBorder,
  MdOutlineExitToApp,
  MdOutlineSettings,
  MdPersonOutline,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';

type UserMenuProps = {
  iconUrl?: string;
  onProfileClick: () => void;
  onBumpProfileClick?: () => void;
  bumpReadyAt?: string;
  onSavedClick?: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
};

const MenuItem = ({
  icon: Icon,
  onClick,
  disabled = false,
  children,
}: {
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[38px] w-full items-center gap-2.5 rounded-full px-3 text-left text-sm text-white no-underline transition-colors focus-visible:bg-background-main ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-background-main'
      }`}
    >
      <Icon size={20} className="text-gray-400" />
      {children}
    </button>
  );

  return disabled ? button : <Popover.Close asChild>{button}</Popover.Close>;
};

const formatBumpCooldown = (ms: number) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const UserMenu: React.FC<UserMenuProps> = ({
  iconUrl,
  onProfileClick,
  onBumpProfileClick,
  bumpReadyAt,
  onSavedClick,
  onSettingsClick,
  onLogoutClick,
}) => {
  const t = useTranslations('UserMenu');
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const readyTime = bumpReadyAt ? new Date(bumpReadyAt).getTime() : 0;
  const bumpRemainingMs = Math.max(0, readyTime - now);
  const isBumpOnCooldown = bumpRemainingMs > 0;

  useEffect(() => {
    if (readyTime <= Date.now()) {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= readyTime) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [readyTime]);

  const triggerButton = (
    <button
      type="button"
      aria-label={t('accountMenu')}
      className="rounded-full transition-opacity duration-200 hover:opacity-80 focus:outline-none focus-visible:opacity-80"
    >
      <Avatar avatarUrl={iconUrl} size="sm" />
    </button>
  );

  if (!isMounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        className="rounded-full"
        tabIndex={-1}
      >
        <Avatar avatarUrl={iconUrl} size="sm" />
      </button>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-[200px] rounded-[18px] border border-gray-500/50 bg-background-dark p-1.5 shadow-lg"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <div className="flex flex-col">
            <MenuItem icon={MdPersonOutline} onClick={onProfileClick}>
              {t('profile')}
            </MenuItem>
            <MenuItem icon={MdBookmarkBorder} onClick={onSavedClick}>
              {t('saved')}
            </MenuItem>
            <MenuItem
              icon={MdArrowUpward}
              onClick={onBumpProfileClick}
              disabled={isBumpOnCooldown}
            >
              {isBumpOnCooldown
                ? t('bumpProfileCooldown', {
                    time: formatBumpCooldown(bumpRemainingMs),
                  })
                : t('bumpProfile')}
            </MenuItem>
            <MenuItem icon={MdOutlineSettings} onClick={onSettingsClick}>
              {t('settings')}
            </MenuItem>
            <div className="my-1 h-[1px] bg-gray-500/50" />
            <MenuItem icon={MdOutlineExitToApp} onClick={onLogoutClick}>
              {t('logout')}
            </MenuItem>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
