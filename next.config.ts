import type { NextConfig } from 'next';
import { getLocalesFromDir } from '@/utils/locales.server';

const nextConfig: NextConfig = {
  i18n: {
    locales: getLocalesFromDir() as string[],
    defaultLocale: 'en',
  },
};

export default nextConfig;
