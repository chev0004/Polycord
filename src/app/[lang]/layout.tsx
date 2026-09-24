import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { getUserSettingsByDiscordUserId } from '@/db';
import { AppShell } from '@/features/Navigation/AppShell';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { TimeFormatProvider } from '@/features/Settings/TimeFormat';
import { getCurrentUser } from '@/lib/auth';
import { locales } from '@/utils/locales';
import { fontVariables } from '../fonts';
import '../globals.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'Metadata' });

  return { title: 'Polycord', description: t('description') };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  if (!locales.includes(lang as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages({ locale: lang });
  const user = await getCurrentUser();
  const settings = user ? await getUserSettingsByDiscordUserId(user.id) : null;

  return (
    <html
      lang={lang}
      data-theme={settings?.theme ?? 'dark'}
      suppressHydrationWarning
    >
      <body
        className={`${fontVariables} bg-background-main text-foreground`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={lang} messages={messages}>
          <LanguageDisplayProvider value={settings?.languageDisplay ?? 'long'}>
            <TimeFormatProvider value={settings?.timeFormat ?? '24hr'}>
              <RouteProgressProvider>
                <AppShell
                  locale={lang}
                  isLoggedIn={Boolean(user)}
                  userAvatarUrl={user?.avatarUrl}
                >
                  {children}
                </AppShell>
              </RouteProgressProvider>
            </TimeFormatProvider>
          </LanguageDisplayProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
