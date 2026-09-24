import type { MetadataRoute } from 'next';
import { locales } from '@/utils/locales';

const privateSegments = [
  'admin',
  'analytics',
  'onboarding',
  'profile',
  'saved',
  'settings',
  'u',
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
        ...locales.flatMap((locale) =>
          privateSegments.map((segment) => `/${locale}/${segment}`),
        ),
      ],
    },
    sitemap: new URL('/sitemap.xml', publicUrl).href,
  };
}
