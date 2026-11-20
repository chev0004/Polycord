import type { MetadataRoute } from 'next';
import { locales } from '@/utils/locales';

const privateSegments = [
  'admin',
  'analytics',
  'inbox',
  'onboarding',
  'profile',
  'saved',
  'settings',
  'u',
  'user',
];

export default function robots(): MetadataRoute.Robots {
  const publicUrl = process.env.POLYCORD_PUBLIC_URL;

  if (!publicUrl) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/banned',
        ...locales.flatMap((locale) =>
          privateSegments.map((segment) => `/${locale}/${segment}`),
        ),
      ],
    },
    sitemap: new URL('/sitemap.xml', publicUrl).href,
  };
}
