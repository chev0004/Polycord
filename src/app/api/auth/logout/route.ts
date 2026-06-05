import { type NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { locales } from '@/utils/locales';

const getLocale = (locale: string | null): (typeof locales)[number] =>
  locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : 'en';

export const GET = (request: NextRequest) => {
  const locale = getLocale(request.nextUrl.searchParams.get('locale'));
  const response = NextResponse.redirect(
    new URL(`/${locale}`, request.nextUrl.origin),
  );

  clearSessionCookie(response);

  return response;
};
