import type { Metadata } from 'next';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Disspeak',
  description: 'Disspeak',
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
