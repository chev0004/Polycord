import { locales } from './locales';

export const isLocale = (value: string): value is (typeof locales)[number] =>
  locales.includes(value as (typeof locales)[number]);

export const localizePath = (path: string, locale: (typeof locales)[number]) =>
  path.replace(/^\/(en|ja)(?=\/|[?#]|$)/, `/${locale}`);
