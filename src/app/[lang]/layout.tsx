import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { resolveTheme, THEME_COOKIE, ThemeProvider } from '@/features/Theme';
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

  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider initialTheme={theme}>
          <NextIntlClientProvider locale={lang} messages={messages}>
            <RouteProgressProvider>{children}</RouteProgressProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
