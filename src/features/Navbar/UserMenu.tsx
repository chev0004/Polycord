import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import {
  MdOutlineExitToApp,
  MdOutlineSettings,
  MdPersonOutline,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';

type UserMenuProps = {
  iconUrl: string;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
};

const MenuItem = ({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ElementType;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white transition-colors hover:bg-background-main/50"
  >
    <Icon size={20} className="text-gray-400" />
    {children}
  </button>
);

export const UserMenu: React.FC<UserMenuProps> = ({
  iconUrl,
  onProfileClick,
  onSettingsClick,
  onLogoutClick,
}) => {
  const t = useTranslations('UserMenu');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="rounded-full transition-all duration-200 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-darker"
        >
          <Avatar avatarUrl={iconUrl} size="sm" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-[200px] rounded-lg border-[1px] border-gray-500/50 bg-background-dark p-1 shadow-lg"
          side="bottom"
          align="end"
          sideOffset={5}
        >
          <div className="flex flex-col gap-1">
            <MenuItem icon={MdPersonOutline} onClick={onProfileClick}>
              {t('profile')}
            </MenuItem>
            <MenuItem icon={MdOutlineSettings} onClick={onSettingsClick}>
              {t('settings')}
            </MenuItem>
            <div className="my-1 h-[1px] bg-gray-500/50" />
            <MenuItem icon={MdOutlineExitToApp} onClick={onLogoutClick}>
              {t('logout')}
            </MenuItem>
          </div>
          <Popover.Arrow className="fill-gray-500/50" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
