import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs';
import shared from '../../../.storybook/main';

const root = resolve(__dirname, '../../..');

const config: StorybookConfig = {
  ...shared,
  addons: [],
  env: async (env) => ({
    ...(await shared.env?.(env ?? {}, {} as never)),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'review',
  }),
  staticDirs: [
    '../../../public',
    { from: '../../../tests/fixtures', to: '/fixtures' },
  ],
  stories: [
    ...shared.stories.map((pattern) => `../../${pattern}`),
    '../**/*.stories.tsx',
  ],
  webpackFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@locale-review/tags': resolve(__dirname, '../tags.ts'),
    };
    config.module?.rules?.unshift(
      {
        test: /[\\/]locales[\\/](en|ja)\.json$/,
        type: 'javascript/auto',
        loader: resolve(__dirname, 'localize.cjs'),
      },
      {
        test: /\.stories\.[jt]sx?$/,
        include: resolve(root, 'src'),
        enforce: 'pre',
        loader: resolve(__dirname, 'instrument.cjs'),
      },
    );
    return config;
  },
};

export default config;
