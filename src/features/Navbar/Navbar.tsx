import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FaDiscord } from 'react-icons/fa';
import { Button } from '@/components/Button';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { Notifications } from '@/types';
import { Inbox } from '../Inbox';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';

type NavbarProps = {
  iconUrl?: string;
  isLoggedIn: boolean;
  dockable?: boolean;
  notifications: Notifications;
  persistNotifications?: boolean;
  premium?: boolean;
  onHomeClick?: () => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onBumpProfileClick?: () => void;
  bumpReadyAt?: string;
  onSavedClick?: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({
  iconUrl,
  isLoggedIn,
  dockable = false,
  onHomeClick,
  onLoginClick,
  notifications,
  persistNotifications = true,
  premium = false,
  onProfileClick,
  onBumpProfileClick,
  bumpReadyAt,
  onSavedClick,
  onSettingsClick,
  onLogoutClick,
}) => {
  const t = useTranslations();
  const loginText = t('loginWithDiscord');
  const mobile = useIsMobile();
  const docked = dockable && mobile === true;

  return (
    <nav className="flex h-16 w-full items-center justify-between gap-4 bg-background-main px-4 font-zen sm:px-10 md:bg-background-darker">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onHomeClick}
          aria-label={t('disspeak')}
          className="flex select-none items-center gap-2.5 font-black font-figtree text-2xl text-foreground tracking-[-0.01em] no-underline focus:outline-none focus-visible:opacity-80 sm:text-[28px]"
        >
          <Image
            src="/polycord-logo.svg"
            alt=""
            width={28}
            height={28}
            className="block"
          />
          <span className={isLoggedIn ? '' : 'hidden sm:inline'}>
            {t('disspeak')}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-[18px]">
        <LanguageSwitcher />

        {docked ? null : isLoggedIn ? (
          <div
            className={`flex items-center gap-[18px] ${dockable ? 'max-md:hidden' : ''}`}
          >
            <Inbox
              notifications={notifications}
              persist={persistNotifications}
              premium={premium}
            />
            <UserMenu
              iconUrl={iconUrl}
              onProfileClick={onProfileClick}
              onBumpProfileClick={onBumpProfileClick}
              bumpReadyAt={bumpReadyAt}
              onSavedClick={onSavedClick}
              onSettingsClick={onSettingsClick}
              onLogoutClick={onLogoutClick}
            />
          </div>
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
