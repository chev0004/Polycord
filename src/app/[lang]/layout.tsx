import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
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
  const messages = await getMessages({ locale: lang });

  return (
    <html lang={lang}>
      <body>
        <NextIntlClientProvider locale={lang} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
