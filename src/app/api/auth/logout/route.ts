import { type NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { locales } from '@/utils/locales';

const getLocale = (locale: string | null): (typeof locales)[number] =>
  locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : 'en';

export const GET = (request: NextRequest) => {
  const locale = getLocale(request.nextUrl.searchParams.get('locale'));
  const response = new NextResponse(
    `<!doctype html><meta http-equiv="refresh" content="0;url=/${locale}">`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

  clearSessionCookie(response);

  return response;
};
