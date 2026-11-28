import type { MetadataRoute } from 'next';
import { localeUrls } from '@/lib/localeAlternates';
import { locales } from '@/utils/locales';

const publicPaths = [
  '',
  '/legal',
  '/legal/terms',
  '/legal/privacy',
  '/legal/guidelines',
  '/advertise',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const publicUrl = process.env.POLYCORD_PUBLIC_URL;

  if (!publicUrl) {
    return [];
  }

  return publicPaths.flatMap((path) => {
    const languages = localeUrls(publicUrl, path);
    return locales.map((locale) => ({
      url: languages[locale],
      alternates: { languages },
    }));
  });
}
