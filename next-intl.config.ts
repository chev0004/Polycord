export default async function getRequestConfig({ locale }: { locale: string }) {
  return {
    messages: (await import(`./src/locales/${locale}.json`)).default,
  };
}
