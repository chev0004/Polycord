import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./next-intl.config.ts');
const publicHost =
  process.env.POLYCORD_PUBLIC_URL &&
  new URL(process.env.POLYCORD_PUBLIC_URL).hostname;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.COMMIT_REF ?? process.env.GITHUB_SHA ?? 'local',
  },
  experimental: { globalNotFound: true },
  async headers() {
    return [
      {
        source: '/:path*',
        ...(publicHost && {
          missing: [{ type: 'host', value: publicHost.replaceAll('.', '\\.') }],
        }),
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
