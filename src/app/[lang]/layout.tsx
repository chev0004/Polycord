import type { Metadata } from 'next';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Polycord',
  description:
    'Polycord is a Discord-based social platform that helps language learners connect through user profiles instead of servers. Traditional discovery platforms focus on finding large communities, but Polycord is all about individuals, helping users find friends, or study buddies who share their target languages and interests.',
};

export default function RootLayout({
  children,
  params: { lang },
}: Readonly<{
  children: React.ReactNode;
  params: { lang: string };
}>) {
  const messages = useMessages();

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
