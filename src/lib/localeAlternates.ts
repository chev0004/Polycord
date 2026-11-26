import { locales } from '@/utils/locales';

export const localeUrls = (publicUrl: string, path: string) =>
  Object.fromEntries(
    locales.map((locale) => [
      locale,
      new URL(`/${locale}${path}`, publicUrl).href,
    ]),
  );

export const localeAlternates = (lang: string, path: string) => {
  const publicUrl = process.env.POLYCORD_PUBLIC_URL;
  if (!publicUrl) return undefined;
  const languages = localeUrls(publicUrl, path);
  return { canonical: languages[lang], languages };
};
