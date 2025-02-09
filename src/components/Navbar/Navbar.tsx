import type { Notifications } from '@/types';
import Image from 'next/image';
import { FaDiscord } from 'react-icons/fa';
import { Button } from '../ui/Button/Button';
import { Inbox } from '../ui/Inbox/Inbox';

type NavbarProps = {
  iconUrl?: string;
  notifications: Notifications;
  onClick: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({
  iconUrl,
  onClick,
  notifications,
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
            {/* TODO: Display inbox */}
            <Inbox notifications={notifications} />
            <div className="flex items-center gap-2">
              {/* TODO: Display actual icon */}
              <Image
                src={iconUrl}
                alt="User avatar"
                className="h-8 w-8 rounded-full"
                width={40}
                height={40}
              />
            </div>
          </>
        ) : (
          <Button
            variant="discord"
            weight="bold"
            icon={FaDiscord}
            onClick={onClick}
          >
            Login with Discord
          </Button>
        )}
      </div>
    </nav>
  );
};
