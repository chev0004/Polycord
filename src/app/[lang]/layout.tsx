import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { DeploymentWatcher } from '@/features/Navigation/DeploymentWatcher';
import { PageLoadTrace } from '@/features/Navigation/PageLoadTrace';
import { locales } from '@/utils/locales';
import { fontVariables } from '../fonts';
import '../globals.css';

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'Metadata' });

  return {
    title: 'Polycord',
    description: t('description'),
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
  };
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

  setRequestLocale(lang);
  const messages = await getMessages({ locale: lang });

  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={`${fontVariables} bg-background-main text-foreground`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={lang} messages={messages}>
          {children}
          <PageLoadTrace />
          <DeploymentWatcher />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
