import {
  getCardThemeByDiscordUserId,
  getUserSettingsByDiscordUserId,
} from '@/db';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { loadStaffNav } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();
  const [settings, cardTheme, staffNav] = user
    ? await Promise.all([
        getUserSettingsByDiscordUserId(user.id),
        getCardThemeByDiscordUserId(user.id),
        loadStaffNav(user),
      ])
    : [null, undefined, null];

  return (
    <LanguageDisplayProvider value={settings?.languageDisplay ?? 'long'}>
      <TimeFormatProvider value={settings?.timeFormat ?? '24hr'}>
        <RouteProgressProvider theme={cardTheme}>
          <AppShell
            locale={lang}
            isLoggedIn={Boolean(user)}
            userAvatarUrl={user?.avatarUrl}
            pendingCases={staffNav?.pendingCases}
          >
            {children}
          </AppShell>
        </RouteProgressProvider>
      </TimeFormatProvider>
    </LanguageDisplayProvider>
  );
}
