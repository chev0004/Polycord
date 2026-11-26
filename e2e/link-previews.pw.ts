import { expect, test } from '@playwright/test';

test('shared links preview a localized image with the sky blue accent', async ({
  page,
  request,
}) => {
  for (const lang of ['en', 'ja']) {
    await page.goto(`/${lang}`);
    const meta = (key: string) =>
      page.locator(`meta[property="${key}"], meta[name="${key}"]`);
    await expect(meta('og:title')).toHaveAttribute(
      'content',
      await page.title(),
    );
    await expect(meta('og:description')).toHaveAttribute('content', /Discord/);
    await expect(meta('twitter:card')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    await expect(meta('theme-color')).toHaveAttribute('content', '#c1d5e9');
    await expect(meta('og:image:width')).toHaveAttribute('content', '1200');
    const image = new URL(
      (await meta('og:image').getAttribute('content')) as string,
    );
    expect(image.pathname).toBe(`/link-preview-${lang}.png`);
    const response = await request.get(image.pathname);
    expect(response.headers()['content-type']).toBe('image/png');
  }
});
