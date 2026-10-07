import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin from '../../plugins/discovery-shell';

let ban = null;
let failed = false;
let input;
mock.module('server-only', () => ({}));
mock.module('../../src/lib/banLookup', () => ({
  lookupBan: async (ip, ids) => {
    input = { ip, ids };
    if (failed) throw new Error('Unavailable');
    return ban;
  },
}));
process.env.AUTH_SECRET = 'static-shell-test-secret';
process.env.POLYCORD_DIRECT_BAN_CHECK = 'true';
globalThis.Netlify = { context: { ip: '198.51.100.7' } };
const { serveDiscoveryDocument } = await import(
  '../../src/lib/discoveryDocument'
);
const { createSessionCookieValue, createBanCookieValue } = await import(
  '../../src/lib/auth-session'
);
const documents = {
  en: '<html lang="en">Public shell</html>',
  ja: '<html lang="ja">Public shell</html>',
};
let forwarded;
const context = {
  next: async (request) => {
    forwarded = request;
    return new Response('next handler', {
      headers: { 'Cache-Control': 'public' },
    });
  },
};
const request = (path, init) =>
  new Request(`https://polycord.test${path}`, {
    ...init,
    headers: { accept: 'text/html', ...init?.headers },
  });
const serve = (req) => serveDiscoveryDocument(req, context, documents);
const session = await createSessionCookieValue(
  { id: 'allowed', name: 'Synthetic' },
  '1',
);
const remembered = await createBanCookieValue('remembered');
await serve(
  request('/en', {
    headers: {
      cookie: `polycord_session=${session}; polycord_banned=${remembered}`,
      'x-forwarded-for': '203.0.113.250',
    },
  }),
);
assert.deepEqual(input, { ip: '198.51.100.7', ids: ['allowed', 'remembered'] });
await serve(
  request('/en', {
    headers: { cookie: 'polycord_session=forged; polycord_banned=forged' },
  }),
);
assert.deepEqual(input.ids, []);
for (const locale of ['en', 'ja']) {
  const response = await serve(request(`/${locale}?q=pending`));
  assert.equal(await response.text(), documents[locale]);
  assert.ok(
    response.headers.get('set-cookie').includes(`NEXT_LOCALE=${locale}`),
  );
}
const headed = await (
  await serveDiscoveryDocument(request('/en'), context, {
    en: '<html><head></head><body>Public shell</body></html>',
  })
).text();
assert.ok(headed.startsWith('<html><head><script>'));
assert.ok(headed.includes('/api/discovery/bootstrap?&locale='));
assert.ok(headed.endsWith('</script></head><body>Public shell</body></html>'));
assert.equal(
  await (await serve(request('/en', { method: 'HEAD' }))).text(),
  '',
);
assert.equal(
  (await serve(request('/en/?q=pending'))).headers.get('location'),
  'https://polycord.test/en?q=pending',
);
for (const req of [
  request('/en', { headers: { rsc: '1', accept: '*/*' } }),
  request('/en?_rsc=payload'),
  request('/en.rsc'),
  request('/en', { method: 'POST' }),
  request('/en', { headers: { accept: '*/*' } }),
]) {
  assert.equal(await (await serve(req)).text(), 'next handler');
  assert.equal(forwarded.headers.get('x-nf-next-middleware'), 'skip');
}
input = undefined;
for (const [headers, expected] of [
  [{}, 'en'],
  [{ 'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8' }, 'ja'],
  [{ 'accept-language': 'fr-FR,fr;q=0.9' }, 'en'],
  [{ 'accept-language': 'ja', cookie: 'NEXT_LOCALE=en' }, 'en'],
]) {
  const redirect = await serve(request('/?q=pending', { headers }));
  assert.equal(redirect.status, 307);
  assert.equal(
    redirect.headers.get('location'),
    `https://polycord.test/${expected}?q=pending`,
  );
  assert.equal(redirect.headers.get('cache-control'), 'no-store');
}
assert.equal(input, undefined);
forwarded = undefined;
for (const req of [
  request('/', { method: 'POST' }),
  request('/', { headers: { rsc: '1', accept: '*/*' } }),
]) {
  assert.equal(await (await serve(req)).text(), 'next handler');
  assert.equal(forwarded.headers.get('x-nf-next-middleware'), null);
}
ban = { date: new Date('2026-10-04'), reference: 'PC-TEST-0001' };
const denied = await serve(request('/ja'));
assert.equal(denied.status, 403);
assert.equal(denied.headers.get('cache-control'), 'no-store');
assert.equal(forwarded.url, 'https://polycord.test/banned');
assert.equal(forwarded.headers.get('x-polycord-ban-locale'), 'ja');
assert.equal(forwarded.headers.get('x-polycord-ban-reference'), ban.reference);
assert.equal((await serve(request('/en', { method: 'POST' }))).status, 403);
failed = true;
const unavailable = await serve(request('/en'));
assert.equal(unavailable.status, 503);
assert.equal(unavailable.headers.get('cache-control'), 'no-store');
const original = process.cwd();
const directory = await mkdtemp(join(tmpdir(), 'disc029-shell-'));
try {
  process.chdir(directory);
  await mkdir('.next/server/app', { recursive: true });
  await mkdir('.netlify/edge-functions', { recursive: true });
  const manifest = {
    routes: {
      '/en': { initialRevalidateSeconds: false },
      '/ja': { initialRevalidateSeconds: false },
    },
  };
  await writeFile('.next/prerender-manifest.json', JSON.stringify(manifest));
  await writeFile(
    '.netlify/edge-functions/manifest.json',
    JSON.stringify({
      version: 1,
      functions: [
        { function: '___netlify-edge-handler-node-middleware', pattern: '.*' },
      ],
    }),
  );
  for (const locale of ['en', 'ja'])
    await writeFile(`.next/server/app/${locale}.html`, documents[locale]);
  const options = { constants: { PUBLISH_DIR: join(directory, '.next') } };
  await plugin.onBuild(options);
  assert.equal(
    JSON.parse(await readFile('.netlify/discovery-documents.json', 'utf8')).ja,
    documents.ja,
  );
  const declarations = JSON.parse(
    await readFile('.netlify/edge-functions/manifest.json', 'utf8'),
  );
  assert.equal(declarations.functions[0].function, 'polycord-discovery-shell');
  assert.equal(
    declarations.functions[1].excludedPattern,
    declarations.functions[0].pattern,
  );
  for (const path of ['/', '/en', '/ja', '/en.rsc', '/ja/'])
    assert.match(path, new RegExp(declarations.functions[0].pattern));
  for (const path of ['/fr', '/en/profile', '/api/discovery'])
    assert.doesNotMatch(path, new RegExp(declarations.functions[0].pattern));
  manifest.routes['/en'].initialRevalidateSeconds = 60;
  await writeFile('.next/prerender-manifest.json', JSON.stringify(manifest));
  await assert.rejects(plugin.onBuild(options), /must be fully prerendered/);
} finally {
  process.chdir(original);
  await rm(directory, { recursive: true, force: true });
}
console.log('static discovery shell preserves the ban gate and RSC routing');
