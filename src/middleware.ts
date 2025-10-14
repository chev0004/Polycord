import createMiddleware from 'next-intl/middleware';
import { locales } from './utils/locales';

export { locales };

export default createMiddleware({
  locales,
  defaultLocale: 'en',
});

export const config = {
  matcher: ['/', '/(ja|en)/:path*'],
};
