import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import type { Notifications } from '@/types';
import { FaDiscord } from 'react-icons/fa';
import { Inbox } from '../Inbox';

type NavbarProps = {
  iconUrl?: string;
  notifications: Notifications;
  onClick: () => void;
  loginText: string;
};

export const Navbar: React.FC<NavbarProps> = ({
  iconUrl,
  onClick,
  notifications,
  loginText,
}) => {
  return (
    <nav className="flex h-16 h-50 w-full items-center justify-between bg-background-darker px-10 font-zen">
      <div className="flex items-center gap-2">
        <span className="font-black font-figtree text-3xl text-white ">
          Disspeak
        </span>
      </div>

      <div className="flex items-center gap-4">
        {iconUrl ? (
          <>
            <Inbox notifications={notifications} />
            <div className="flex items-center gap-2">
              <Avatar avatarUrl={iconUrl} size="sm" />
            </div>
          </>
        ) : (
          <Button
            variant="discord"
            weight="bold"
            icon={FaDiscord}
            onClick={onClick}
          >
            {loginText}
          </Button>
        )}
      </div>
    </nav>
  );
};
