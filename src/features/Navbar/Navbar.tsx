import { useTranslations } from 'next-intl';
import { FaDiscord } from 'react-icons/fa';
import { Button } from '@/components/Button';
import type { Notifications } from '@/types';
import { Inbox } from '../Inbox';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';

type NavbarProps = {
  iconUrl?: string;
  notifications: Notifications;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({
  iconUrl,
  onLoginClick,
  notifications,
  onProfileClick,
  onSettingsClick,
  onLogoutClick,
}) => {
  const t = useTranslations();
  const loginText = t('loginWithDiscord');

  return (
    <nav className="flex h-16 h-50 w-full items-center justify-between bg-background-darker px-10 font-zen">
      <div className="flex items-center gap-2">
        <span className="font-black font-figtree text-3xl text-white">
          {t('disspeak')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        {iconUrl ? (
          <>
            <Inbox notifications={notifications} />
            <UserMenu
              iconUrl={iconUrl}
              onProfileClick={onProfileClick}
              onSettingsClick={onSettingsClick}
              onLogoutClick={onLogoutClick}
            />
          </>
        ) : (
          <Button
            variant="discord"
            weight="bold"
            icon={FaDiscord}
            onClick={onLoginClick}
          >
            {loginText}
          </Button>
        )}
      </div>
    </nav>
  );
};
