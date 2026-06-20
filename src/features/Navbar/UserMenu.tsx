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
  onSavedClick?: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
};

const MenuItem = ({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ElementType;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <Popover.Close asChild>
    <button
      type="button"
      onClick={onClick}
      className="flex h-[38px] w-full items-center gap-2.5 rounded-full px-3 text-left text-sm text-white no-underline transition-colors hover:bg-background-main"
    >
      <Icon size={20} className="text-gray-400" />
      {children}
    </button>
  </Popover.Close>
);

export const UserMenu: React.FC<UserMenuProps> = ({
  iconUrl,
  onProfileClick,
  onBumpProfileClick,
  onSavedClick,
  onSettingsClick,
  onLogoutClick,
}) => {
  const t = useTranslations('UserMenu');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerButton = (
    <button
      type="button"
      className="rounded-full transition-opacity duration-200 hover:opacity-80 focus:outline-none"
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
            <MenuItem icon={MdArrowUpward} onClick={onBumpProfileClick}>
              {t('bumpProfile')}
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
