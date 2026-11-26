import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { DeploymentWatcher } from '@/features/Navigation/DeploymentWatcher';
import { PageLoadTrace } from '@/features/Navigation/PageLoadTrace';
import { ProfileSheetLayout } from '@/features/Profile/ProfileSheetLayout';
import { locales } from '@/utils/locales';
import { fontVariables } from '../fonts';
import '../globals.css';

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export const viewport: Viewport = { themeColor: '#c1d5e9' };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: 'Metadata' });
  const publicUrl = process.env.POLYCORD_PUBLIC_URL;

  return {
    metadataBase: publicUrl ? new URL(publicUrl) : undefined,
    title: { default: 'Polycord', template: t('titleTemplate') },
    description: t('description'),
    openGraph: {
      images: {
        url: `/link-preview-${lang}.png`,
        width: 1200,
        height: 630,
        alt: t('previewAlt'),
      },
    },
    twitter: { card: 'summary_large_image' },
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
          <ProfileSheetLayout>{children}</ProfileSheetLayout>
          <PageLoadTrace />
          <DeploymentWatcher />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
