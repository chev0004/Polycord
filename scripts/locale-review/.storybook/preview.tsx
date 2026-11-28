import type { Preview } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import { fontVariables } from '@/app/fonts';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import {
  createPreviewBridge,
  mergeMessages,
  type PreviewWindow,
} from '../preview';
import type { Locale } from '../review-state';
import '@/app/globals.css';

function Fixture({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const original = locale === 'ja' ? ja : en;
  const parent = window.parent as PreviewWindow;
  const run = new URLSearchParams(window.location.search).get('run') ?? '';
  const input = parent.localeReviewInputs?.get(run);
  const [messages] = useState(() =>
    mergeMessages(original, input?.locale === locale ? input.wording : {}),
  );

  useEffect(() => {
    const view = window as PreviewWindow;
    view.localeReview = createPreviewBridge();
    return () => {
      delete view.localeReview;
    };
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <div className={fontVariables} lang={locale}>
        <style>
          {
            '[data-locale-review-active] { background: #333d4b; box-shadow: 0 0 0 3px #879caf66; }'
          }
        </style>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, { id, args }) => {
      if (id === 'dev-locale-review--reviewer') return <Story />;
      const locale =
        new URLSearchParams(window.location.search).get('locale') === 'ja'
          ? 'ja'
          : 'en';
      const storyArgs = Object.hasOwn(args, 'locale')
        ? { ...args, locale }
        : args;
      return (
        <Fixture locale={locale}>
          <Story args={storyArgs} />
        </Fixture>
      );
    },
  ],
};

export default preview;
