import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const [origin, sceneFile, output] = process.argv.slice(2);
const scenes = JSON.parse(await readFile(sceneFile, 'utf8'));
const queue = scenes.flatMap((scene) =>
  ['en', 'ja'].map((locale) => ({ scene, locale })),
);
const catalogue = { scenes: {}, errors: [] };
const browser = await chromium
  .launch()
  .catch(() => chromium.launch({ channel: 'chrome' }));
let next = 0;
let done = 0;

async function readScene(context, scene, locale) {
  const page = await context.newPage();
  const timeout = setTimeout(() => void page.close().catch(() => {}), 50_000);
  try {
    await page.setViewportSize({
      width: scene.viewport === 'mobile' ? 390 : 1120,
      height: 900,
    });
    await page.goto(
      `${origin}/iframe.html?${new URLSearchParams({
        id: scene.story,
        viewMode: 'story',
        locale,
        trace: '1',
      })}`,
      { waitUntil: 'domcontentloaded', timeout: 20_000 },
    );
    await page.waitForFunction(
      () =>
        window.localeReview || document.querySelector('.sb-show-errordisplay'),
      undefined,
      { timeout: 15_000 },
    );
    const error = await page
      .locator('.sb-show-errordisplay .sb-errordisplay_code')
      .allTextContents();
    if (error.length) throw new Error(error.join(' ').slice(0, 300));
    await page.waitForTimeout(400);
    return await page.evaluate(async (scene) => {
      const paths = await window.localeReview.prepare(scene, false);
      await new Promise((resolve) => setTimeout(resolve, 450));
      return { ...paths, ...window.localeReview.inspect(scene) };
    }, scene);
  } finally {
    clearTimeout(timeout);
    await page.close().catch(() => {});
  }
}

async function worker() {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  while (next < queue.length) {
    const { scene, locale } = queue[next++];
    try {
      const result = await readScene(context, scene, locale).catch(() =>
        readScene(context, scene, locale),
      );
      catalogue.scenes[scene.id] ??= {};
      catalogue.scenes[scene.id][locale] = result;
    } catch (error) {
      const reason = `${scene.section} · ${scene.state} · ${scene.viewport}. ${error.message.split('\n')[0]}`;
      catalogue.errors.push({ scene: scene.id, locale, reason });
    }
    if (++done % 50 === 0)
      console.log(`Indexed ${done}/${queue.length} previews.`);
  }
  await context.close();
}

try {
  await Promise.all(Array.from({ length: 6 }, worker));
  if (!Object.keys(catalogue.scenes).length)
    throw new Error('No preview locations could be indexed.');
  await writeFile(output, JSON.stringify(catalogue));
  console.log(
    `Indexed ${queue.length - catalogue.errors.length}/${queue.length} previews.`,
  );
} finally {
  await browser.close();
}
