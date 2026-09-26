import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { MINIMAL_VIEWPORTS } from '@storybook/addon-viewport';

type PlayWindow = Window & {
  __STORYBOOK_ADDONS_CHANNEL__?: {
    on: (event: string, listener: (payload: never) => void) => void;
  };
  __viewport?: keyof typeof MINIMAL_VIEWPORTS;
  __result?: string;
};

const root = join(process.cwd(), 'storybook-static');
const entries: Record<string, { id: string; type: string }> = JSON.parse(
  readFileSync(join(root, 'index.json'), 'utf8'),
).entries;

const listen = () => {
  const view = window as PlayWindow;
  const timer = setInterval(() => {
    const channel = view.__STORYBOOK_ADDONS_CHANNEL__;
    if (!channel) return;
    clearInterval(timer);
    const finish = (result: string) => {
      view.__result ??= result;
    };
    channel.on(
      'storyPrepared',
      ({
        parameters,
      }: {
        parameters: { viewport?: Record<string, never> };
      }) => {
        view.__viewport = parameters.viewport?.defaultViewport;
      },
    );
    channel.on('playFunctionThrewException', ({ message }: Error) =>
      finish(message),
    );
    channel.on('storyThrewException', ({ message }: Error) => finish(message));
    channel.on(
      'storyErrored',
      ({ title, description }: { title: string; description: string }) =>
        finish(`${title} ${description}`),
    );
    channel.on('storyFinished', ({ status }: { status: string }) =>
      finish(status === 'success' ? 'passed' : status),
    );
  }, 10);
};

const play = async (page: Page) =>
  (
    await page.waitForFunction(() => (window as PlayWindow).__result)
  ).jsonValue();

test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) => {
    const file = join(root, new URL(route.request().url()).pathname);
    return existsSync(file)
      ? route.fulfill({ path: file })
      : route.fulfill({ status: 404 });
  });
  await context.addInitScript(listen);
});

for (const { id } of Object.values(entries).filter(
  ({ type }) => type === 'story',
)) {
  test(id, async ({ context, page }) => {
    const url = `/iframe.html?id=${id}&viewMode=story`;
    await page.goto(url);
    let result = await play(page);
    const viewport = await page.evaluate(
      () => (window as PlayWindow).__viewport,
    );
    if (viewport) {
      const { width, height } = MINIMAL_VIEWPORTS[viewport].styles;
      const phone = await context.newPage();
      await phone.setViewportSize({
        width: Number.parseInt(width, 10),
        height: Number.parseInt(height, 10),
      });
      await phone.goto(url);
      result = await play(phone);
    }
    expect(result).toBe('passed');
  });
}
