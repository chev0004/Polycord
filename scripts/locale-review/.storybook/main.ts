import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/nextjs';
import shared from '../../../.storybook/main';

const root = resolve(__dirname, '../../..');

const config: StorybookConfig = {
  ...shared,
  addons: [],
  staticDirs: [
    '../../../public',
    { from: '../../../tests/fixtures', to: '/fixtures' },
  ],
  stories: [
    ...shared.stories.map((pattern) => `../../${pattern}`),
    '../review.stories.tsx',
  ],
  webpackFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@locale-review/intl': resolve(__dirname, '../intl.ts'),
    };
    config.module?.rules?.unshift({
      test: /\.[jt]sx?$/,
      include: resolve(root, 'src'),
      enforce: 'pre',
      loader: resolve(__dirname, 'instrument.cjs'),
    });
    return config;
  },
};

export default config;
