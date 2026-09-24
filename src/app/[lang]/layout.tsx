import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { getUserSettingsByDiscordUserId } from '@/db';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { LanguageDisplayProvider } from '@/features/Settings/LanguageDisplay';
import { getCurrentUser } from '@/lib/auth';
import { locales } from '@/utils/locales';
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
    <html lang={lang} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={lang} messages={messages}>
          <LanguageDisplayProvider value={settings?.languageDisplay ?? 'long'}>
            <RouteProgressProvider>{children}</RouteProgressProvider>
          </LanguageDisplayProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
