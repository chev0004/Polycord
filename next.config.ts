import type { NextConfig } from 'next';
import { locales } from '@/utils/locales';

const nextConfig: NextConfig = {
  i18n: {
    locales: locales as string[],
    defaultLocale: 'en',
  },
};

export default nextConfig;
