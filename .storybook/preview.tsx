import type { Preview } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import { fontVariables } from '../src/app/fonts';
import '@/app/globals.css';

const preview: Preview = {
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ja', title: '日本語' },
        ],
        showName: true,
      },
    },
  },

  loaders: [
    async (context) => {
      const locale = context.globals.locale || 'en';
      return {
        messages: (await import(`../src/locales/${locale}.json`)).default,
      };
    },
  ],

  decorators: [
    (Story, context) => {
      const { messages } = context.loaded;
      const locale = context.globals.locale || 'en';

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className={fontVariables}>
            <Story />
          </div>
        </NextIntlClientProvider>
      );
    },
  ],

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: 'var(--color-background-main)',
        },
      ],
    },
  },
};

export default preview;
