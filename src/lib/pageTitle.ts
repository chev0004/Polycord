import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localeAlternates } from './localeAlternates';

export const pageTitle =
  (key: string, publicPath?: string) =>
  async ({
    params,
  }: {
    params: Promise<{ lang: string }>;
  }): Promise<Metadata> => {
    const { lang } = await params;
    const t = await getTranslations({ locale: lang, namespace: 'PageTitle' });

    return {
      title: t(key),
      alternates:
        publicPath === undefined
          ? undefined
          : localeAlternates(lang, publicPath),
    };
  };
