import { expect, test } from '@playwright/test';

test('japanese policies use an accurate english fallback', async ({
  page,
}, testInfo) => {
  for (const [route, heading] of [
    ['terms', 'Your account and Discord sign-in'],
    ['privacy', 'Data retention'],
    ['guidelines', 'Reporting and blocking'],
  ]) {
    await page.goto(`/ja/legal/${route}`);
    await expect(
      page.getByText(
        'このページは英語のみで提供されています。適用されるのは英語版の内容です。',
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText('翻訳は準備中です')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`ja-${route}.png`),
      animations: 'disabled',
    });
  }
  await page.goto('/en/legal/privacy');
  await expect(page.getByText(/fallback|English only/)).toHaveCount(0);
  await expect(
    page.getByText(/Logged-out visitors can see and copy it only if/),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('en-privacy.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
