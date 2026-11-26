import { locales } from '@/utils/locales';

export const localeUrls = (publicUrl: string, path: string) =>
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      new URL(`/${locale}${path}`, publicUrl).href,
    ]),
  );
