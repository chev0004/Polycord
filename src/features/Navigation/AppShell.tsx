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
import { StaffPill } from '@/features/Admin/StaffPill';
import { Footer } from '@/features/Footer';
import { Navbar } from '@/features/Navbar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { MobileNavigation } from './MobileNavigation';
import { useRouteProgressRouter } from './RouteProgress';
import { signInHref } from './signIn';

type BumpAction = { onClick: () => void; readyAt?: string };

const BumpContext = createContext<(action: BumpAction | null) => void>(
  () => {},
);

export const useNavbarBump = (
  onClick: (() => void) | undefined,
  readyAt?: string,
) => {
  const setBump = useContext(BumpContext);
  const handler = useRef(onClick);
  const enabled = Boolean(onClick);

  useEffect(() => {
    handler.current = onClick;
  });

  useEffect(() => {
    if (!enabled) return;
    setBump({ onClick: () => handler.current?.(), readyAt });
    return () => setBump(null);
  }, [setBump, enabled, readyAt]);
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
  const staffArea = pathname.split('/')[2] === 'admin';
  const dockable =
    isLoggedIn && !pathname.endsWith('/onboarding') && !staffArea;
  const docked = dockable && mobile === true;

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
          badge={staffArea ? <StaffPill /> : undefined}
          notifications={[]}
          onHomeClick={() => router.push(`/${locale}`)}
          onLoginClick={() => window.location.assign(signInHref(locale))}
          onProfileClick={() => router.push(`/${locale}/profile`)}
          onBumpProfileClick={bump?.onClick}
          bumpReadyAt={bump?.readyAt}
          onSavedClick={() => router.push(`/${locale}/saved`)}
          onSettingsClick={() => router.push(`/${locale}/settings`)}
          onLogoutClick={() =>
            window.location.assign(`/api/auth/logout?locale=${locale}`)
          }
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer locale={locale} />
        {docked ? (
          <MobileNavigation
            locale={locale}
            userAvatarUrl={userAvatarUrl}
            onNavigate={(href) => router.push(href)}
            onBump={bump?.onClick}
            bumpReadyAt={bump?.readyAt}
          />
        ) : null}
      </div>
    </BumpContext.Provider>
  );
};
