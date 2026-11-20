import { afterEach, expect, test } from 'bun:test';
import robots from './robots';
import sitemap from './sitemap';

const original = process.env.POLYCORD_PUBLIC_URL;

afterEach(() => {
  if (original === undefined) delete process.env.POLYCORD_PUBLIC_URL;
  else process.env.POLYCORD_PUBLIC_URL = original;
});

test('without a public origin nothing is crawlable or listed', () => {
  delete process.env.POLYCORD_PUBLIC_URL;
  expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  expect(sitemap()).toEqual([]);
});

test('production allows public pages and keeps private routes out', () => {
  process.env.POLYCORD_PUBLIC_URL = 'https://polycord.example';
  const { rules, sitemap: map } = robots();
  const disallow = (rules as { disallow: string[] }).disallow;
  expect(map).toBe('https://polycord.example/sitemap.xml');
  for (const locale of ['en', 'ja'])
    for (const segment of ['inbox', 'settings', 'saved', 'admin', 'u', 'user'])
      expect(disallow).toContain(`/${locale}/${segment}`);
  expect(disallow).toContain('/api/');
  expect(disallow).toContain('/banned');
});

test('the sitemap lists public pages in both locales on the production origin', () => {
  process.env.POLYCORD_PUBLIC_URL = 'https://polycord.example';
  const urls = sitemap().map(({ url }) => url);
  expect(urls).toContain('https://polycord.example/en/legal/terms');
  expect(urls).toContain('https://polycord.example/ja/legal/privacy');
  expect(urls.every((url) => url.startsWith('https://polycord.example/'))).toBe(
    true,
  );
});
