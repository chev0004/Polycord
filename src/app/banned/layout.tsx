import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { BAN_LOCALE_HEADER } from '@/lib/auth-session';
import { fontVariables } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Polycord',
  robots: { index: false, follow: false },
};

export default async function BannedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = (await headers()).get(BAN_LOCALE_HEADER) ?? 'en';

  return (
    <html lang={lang}>
      <body className={`${fontVariables} bg-background-main text-foreground`}>
        {children}
      </body>
    </html>
  );
}
