import type { MetadataRoute } from 'next';
import { locales } from '@/utils/locales';

const publicPaths = [
  '',
  '/legal',
  '/legal/terms',
  '/legal/privacy',
  '/legal/guidelines',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const publicUrl = process.env.POLYCORD_PUBLIC_URL;

  if (!publicUrl) {
    return [];
  }

  const localeUrl = (locale: string, path: string) =>
    new URL(`/${locale}${path}`, publicUrl).href;

  return publicPaths.flatMap((path) =>
    locales.map((locale) => ({
      url: localeUrl(locale, path),
      alternates: {
        languages: Object.fromEntries(
          locales.map((alternate) => [alternate, localeUrl(alternate, path)]),
        ),
      },
    })),
  );
}
