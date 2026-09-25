'use client';

import { usePathname } from 'next/navigation';
import {
  type CSSProperties,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Footer } from '@/features/Footer';
import { Navbar } from '@/features/Navbar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { MobileDock } from './MobileDock';
import { useRouteProgressRouter } from './RouteProgress';
import { signInHref } from './signIn';

type BumpAction = { onClick: () => void; readyAt?: string };

const BumpContext = createContext<(action: BumpAction | null) => void>(
  () => {},
);

export const useNavbarBump = (onClick: () => void, readyAt?: string) => {
  const setBump = useContext(BumpContext);
  const handler = useRef(onClick);

  useEffect(() => {
    handler.current = onClick;
  });

  useEffect(() => {
    setBump({ onClick: () => handler.current(), readyAt });
    return () => setBump(null);
  }, [setBump, readyAt]);
};

type AppShellProps = {
  locale: string;
  isLoggedIn: boolean;
  userAvatarUrl?: string;
  children: React.ReactNode;
};

export const AppShell = ({
  locale,
  isLoggedIn,
  userAvatarUrl,
  children,
}: AppShellProps) => {
  const router = useRouteProgressRouter();
  const [bump, setBump] = useState<BumpAction | null>(null);
  const pathname = usePathname();
  const mobile = useIsMobile();
  const dockable = isLoggedIn && !pathname.endsWith('/onboarding');
  const docked = dockable && mobile === true;
  const logout = () =>
    window.location.assign(`/api/auth/logout?locale=${locale}`);

  return (
    <BumpContext.Provider value={setBump}>
      <div
        className="flex min-h-screen flex-col bg-background-main pb-[var(--dock-space,0px)] text-foreground"
        style={
          docked
            ? ({
                '--dock-space': 'calc(env(safe-area-inset-bottom) + 88px)',
              } as CSSProperties)
            : undefined
        }
      >
        <Navbar
          iconUrl={userAvatarUrl}
          isLoggedIn={isLoggedIn}
          dockable={dockable}
          notifications={[]}
          onHomeClick={() => router.push(`/${locale}`)}
          onLoginClick={() => window.location.assign(signInHref(locale))}
          onProfileClick={() => router.push(`/${locale}/profile`)}
          onBumpProfileClick={bump?.onClick}
          bumpReadyAt={bump?.readyAt}
          onSavedClick={() => router.push(`/${locale}/saved`)}
          onSettingsClick={() => router.push(`/${locale}/settings`)}
          onLogoutClick={logout}
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer locale={locale} />
        {docked ? (
          <MobileDock
            locale={locale}
            userAvatarUrl={userAvatarUrl}
            onNavigate={(href) => router.push(href)}
            onLogout={logout}
            onBumpProfile={bump?.onClick}
            bumpReadyAt={bump?.readyAt}
          />
        ) : null}
      </div>
    </BumpContext.Provider>
  );
};
