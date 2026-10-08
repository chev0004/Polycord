import {
  getCardThemeByDiscordUserId,
  getUserSettingsByDiscordUserId,
} from '@/db';
import { withRenderPool } from '@/db/client';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { loadStaffNav } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { measureLoad } from '@/lib/loadTrace';
import { createPageLoadTrace } from '@/lib/pageLoadTrace';

type AppFrameProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export const AppFrame = (props: AppFrameProps) =>
  withRenderPool(() => renderFrame(props));

async function renderFrame({ children, params }: AppFrameProps) {
  const { lang } = await params;
  const trace = await createPageLoadTrace();
  const measure = trace?.measure ?? measureLoad;
  const user = await measure('layout-account', getCurrentUser);
  const [settings, cardTheme, staffNav] = user
    ? await Promise.all([
        measure('layout-settings', () =>
          getUserSettingsByDiscordUserId(user.id),
        ),
        measure('layout-theme', () => getCardThemeByDiscordUserId(user.id)),
        measure('layout-staff', () => loadStaffNav(user)),
      ])
    : [null, undefined, null];

  return (
    <LanguageDisplayProvider value={settings?.languageDisplay ?? 'long'}>
      {trace && (
        <script id="polycord-load-trace" type="application/json">
          {JSON.stringify({
            spans: trace.spans,
            transport:
              process.env.POLYCORD_DIRECT_BAN_CHECK === 'true'
                ? 'direct'
                : 'https',
          }).replaceAll('<', '\\u003c')}
        </script>
      )}
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
