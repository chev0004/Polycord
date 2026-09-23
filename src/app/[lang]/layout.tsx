import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getUserSettingsByDiscordUserId } from '@/db';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { getCurrentUser } from '@/lib/auth';
import { locales } from '@/utils/locales';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Polycord',
  description:
    'Polycord is a Discord-based social platform that helps language learners connect through user profiles instead of servers. Traditional discovery platforms focus on finding large communities, but Polycord is all about individuals, helping users find friends, or study buddies who share their target languages and interests.',
};

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
        className="bg-background-main text-foreground"
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={lang} messages={messages}>
          <LanguageDisplayProvider value={settings?.languageDisplay ?? 'long'}>
            <RouteProgressProvider>{children}</RouteProgressProvider>
          </LanguageDisplayProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
