import { locales } from './locales';

export const isLocale = (value: string): value is (typeof locales)[number] =>
  locales.includes(value as (typeof locales)[number]);

const localePrefix = new RegExp(`^/(${locales.join('|')})(?=/|[?#]|$)`);

export const isLocalePath = (path: string) => localePrefix.test(path);

export const localizePath = (path: string, locale: (typeof locales)[number]) =>
  path.replace(localePrefix, `/${locale}`);
