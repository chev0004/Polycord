import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin from '../../plugins/discovery-shell';

globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { NextRequest } = await import('next/server');
let ban = null;
let failed = false;
mock.module('../../src/lib/banLookup', () => ({
  lookupBan: async () => {
    if (failed) throw new Error('Unavailable');
    return ban;
  },
}));
process.env.AUTH_SECRET = 'static-shell-test-secret';
process.env.POLYCORD_DIRECT_BAN_CHECK = 'true';
const { default: middleware } = await import('../../src/middleware');
const request = (path, init) =>
  new NextRequest(`https://polycord.test${path}`, {
    ...init,
    headers: { accept: 'text/html', ...init?.headers },
  });
const rewrite = (response) => response.headers.get('x-middleware-rewrite');

process.env.POLYCORD_STATIC_DISCOVERY_SHELL = 'false';
assert.equal(rewrite(await middleware(request('/en'))), null);
process.env.POLYCORD_STATIC_DISCOVERY_SHELL = 'true';
for (const locale of ['en', 'ja']) {
  const response = await middleware(request(`/${locale}?search=pending`));
  assert.equal(
    rewrite(response),
    `https://polycord.test/__discovery_shell/${locale}.html`,
  );
  assert.equal(
    response.headers.get('cache-control'),
    'public, max-age=0, must-revalidate',
  );
}
assert.match(
  rewrite(await middleware(request('/en', { method: 'HEAD' }))),
  /__discovery_shell/,
);
for (const req of [
  request('/en', { headers: { rsc: '1' } }),
  request('/en', { headers: { accept: '*/*' } }),
  request('/en?_rsc=payload'),
  request('/en', { method: 'POST' }),
  request('/en/legal'),
]) {
  assert.ok(!rewrite(await middleware(req))?.includes('__discovery_shell'));
}
const { adapter } = await import('next/dist/server/web/adapter');
const flight = await adapter({
  handler: middleware,
  page: '/middleware',
  request: {
    url: 'https://polycord.test/en?_rsc=proof',
    method: 'GET',
    headers: { rsc: '1', accept: '*/*' },
    nextConfig: {},
  },
});
assert.ok(!rewrite(flight.response)?.includes('__discovery_shell'));
for (const path of [
  '/__discovery_shell/en.html',
  '/__discovery_shell/ja',
  '/__discovery_shell',
]) {
  assert.equal((await middleware(request(path))).status, 404);
}
ban = { date: new Date('2026-10-04'), reference: 'PC-TEST-0001' };
const banned = await middleware(request('/en'));
assert.equal(rewrite(banned), 'https://polycord.test/banned');
assert.equal(banned.headers.get('cache-control'), 'no-store');
assert.equal(
  (await middleware(request('/__discovery_shell/en.html'))).status,
  403,
);
failed = true;
for (const path of ['/en', '/__discovery_shell/en.html']) {
  const response = await middleware(request(path));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
}

const original = process.cwd();
const directory = await mkdtemp(join(tmpdir(), 'disc029-shell-'));
try {
  process.chdir(directory);
  await mkdir('.next/server/app', { recursive: true });
  const manifest = {
    routes: {
      '/en': { initialRevalidateSeconds: false },
      '/ja': { initialRevalidateSeconds: false },
    },
  };
  await writeFile('.next/prerender-manifest.json', JSON.stringify(manifest));
  for (const locale of ['en', 'ja'])
    await writeFile(
      `.next/server/app/${locale}.html`,
      `<html lang="${locale}">Public shell</html>`,
    );
  const options = { constants: { PUBLISH_DIR: join(directory, '.next') } };
  await plugin.onBuild(options);
  assert.equal(
    await readFile('.netlify/static/__discovery_shell/ja.html', 'utf8'),
    '<html lang="ja">Public shell</html>',
  );
  manifest.routes['/en'].initialRevalidateSeconds = 60;
  await writeFile('.next/prerender-manifest.json', JSON.stringify(manifest));
  await assert.rejects(plugin.onBuild(options), /must be fully prerendered/);
} finally {
  process.chdir(original);
  await rm(directory, { recursive: true, force: true });
}
console.log('static discovery shell preserves the ban gate and RSC routing');
