import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./next-intl.config.ts');

const nextConfig: NextConfig = {
  env: {
    POLYCORD_STATIC_DISCOVERY_SHELL:
      process.env.POLYCORD_STATIC_DISCOVERY_SHELL ?? 'false',
  },
  experimental: { globalNotFound: true },
  async headers() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'polycord\\.chev\\.dev' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  serverExternalPackages: ['ffprobe-static'],
  transpilePackages: ['pg'],
  outputFileTracingIncludes: {
    '/api/profile/voice': [
      `node_modules/ffprobe-static/bin/${process.platform}/${process.arch}/*`,
    ],
    '/api/admin/seed': ['src/lib/seed/voices/*.webm'],
  },
  outputFileTracingExcludes: {
    '*': [
      `node_modules/ffprobe-static/bin/!(${process.platform})/**/*`,
      `node_modules/ffprobe-static/bin/${process.platform}/!(${process.arch})/**/*`,
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
