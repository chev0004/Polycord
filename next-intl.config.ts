const DEFAULT_LOCALE = 'en';

export default async function getRequestConfig({
  locale,
}: {
  locale?: string;
}) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE;

  return {
    locale: resolvedLocale,
    messages: (await import(`./src/locales/${resolvedLocale}.json`)).default,
  };
}
