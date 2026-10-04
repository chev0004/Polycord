import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FaDiscord } from 'react-icons/fa';
import { Button } from '@/components/Button';
import { siteContainerClass } from '@/components/Container';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { Notifications } from '@/types';
import { Inbox } from '../Inbox';
import { AdminButton } from './AdminButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';

type NavbarProps = {
  iconUrl?: string;
  isLoggedIn: boolean;
  dockable?: boolean;
  badge?: React.ReactNode;
  notifications: Notifications;
  pendingCases?: number;
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
  badge,
  onHomeClick,
  onLoginClick,
  notifications,
  pendingCases,
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
    <nav className="w-full bg-background-main font-zen md:border-gray-500/20 md:border-b md:bg-background-darker">
      <div
        className={`${siteContainerClass} flex h-16 items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onHomeClick}
            aria-label={t('disspeak')}
            className="flex select-none items-center focus:outline-none focus-visible:opacity-80"
          >
            <Image
              src="/polycord-wordmark.svg"
              alt=""
              width={68}
              height={18}
              className="block h-4 w-auto sm:h-[18px]"
            />
          </button>
          {badge}
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          {pendingCases === undefined ? null : (
            <AdminButton pendingCases={pendingCases} />
          )}

          {docked ? null : isLoggedIn ? (
            <div
              className={`flex items-center gap-4 ${dockable ? 'max-md:hidden' : ''}`}
            >
              <Inbox
                notifications={notifications}
                persist={persistNotifications}
                premium={premium}
              />
              <span className="h-[22px] w-px bg-gray-500/35" />
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
      </div>
    </nav>
  );
};
