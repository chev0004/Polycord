import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: [
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/features/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/app/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions',
  ],
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_DISCOVERY_SKELETON_ENABLED: 'true',
  }),
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
};
export default config;
