'use client';

import { Footer } from '@/features/Footer';
import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';

type LegalShellProps = {
  locale: string;
  isLoggedIn: boolean;
  userAvatarUrl?: string;
  children: React.ReactNode;
};

export const LegalShell = ({
  locale,
  isLoggedIn,
  userAvatarUrl,
  children,
}: LegalShellProps) => {
  const router = useRouteProgressRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background-main text-white">
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn={isLoggedIn}
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSavedClick={() => router.push(`/${locale}/saved`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />

      <main className="flex-1">{children}</main>

      <Footer locale={locale} />
    </div>
  );
};
