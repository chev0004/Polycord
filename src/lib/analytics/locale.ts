import { locales } from '@/utils/locales';

export const localeFromPath = (path?: string | null): string | null => {
  if (!path) {
    return null;
  }

  const segment = path.split('/').filter(Boolean)[0];

  return locales.includes(segment as (typeof locales)[number]) ? segment : null;
};

export const localeFromRequest = (request: Request): string | null => {
  const referer = request.headers.get('referer');

  if (!referer) {
    return null;
  }

  try {
    return localeFromPath(new URL(referer).pathname);
  } catch {
    return null;
  }
};
