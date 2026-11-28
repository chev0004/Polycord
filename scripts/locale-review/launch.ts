import { mkdir } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { allScenes } from './placements';

const cache = resolve('.locale-review');
const output = join(cache, 'storybook');
const index = join(cache, 'placements.json');
const stamp = join(cache, 'fingerprint');
const sceneFile = join(cache, 'scenes.json');
const options = process.argv.slice(2);
const port = 6014;

async function fingerprint() {
  const hash = new Bun.CryptoHasher('sha256');
  const patterns = [
    ...[
      'src',
      'public',
      'tests/fixtures',
      '.storybook',
      'scripts/locale-review',
    ].map((directory) => `${directory}/**/*`),
    '{package.json,bun.lock,postcss.config.mjs,tailwind.config.ts,next.config.ts,tsconfig.json}',
  ];
  for (const pattern of patterns) {
    const paths = await Array.fromAsync(
      new Bun.Glob(pattern).scan({ dot: true }),
    );
    for (const path of paths.sort()) {
      const file = Bun.file(path);
      hash.update(JSON.stringify([path, file.size]));
      hash.update(await file.arrayBuffer());
    }
  }
  return hash.digest('hex');
}

async function run(args: string[]) {
  const task = Bun.spawn(args, {
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS:
        `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=8192`.trim(),
    },
  });
  if (await task.exited) throw new Error(`${args[1]} failed.`);
}

await mkdir(cache, { recursive: true });
const hash = await fingerprint();
const cached = Bun.file(stamp);
const reusable =
  !options.includes('--rebuild') &&
  (await cached.exists()) &&
  (await cached.text()) === hash &&
  (await Bun.file(index).exists()) &&
  (await Bun.file(join(output, 'iframe.html')).exists());
let indexed = reusable;

const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname);
    if (path === '/placements.json' && !indexed)
      return new Response(null, { status: 503 });
    const file =
      path === '/placements.json'
        ? index
        : resolve(output, `.${path === '/' ? '/index.html' : path}`);
    const destination = relative(output, file);
    if (
      file !== index &&
      (destination.startsWith('..') || isAbsolute(destination))
    ) {
      return new Response(null, { status: 404 });
    }
    const asset = Bun.file(file);
    if (!extname(file) || !(await asset.exists()))
      return new Response(null, { status: 404 });
    return new Response(asset);
  },
});

try {
  if (!reusable) {
    console.log('Building local review previews…');
    await Bun.write(stamp, '');
    await run([
      'node',
      'node_modules/storybook/bin/index.cjs',
      'build',
      '--config-dir',
      'scripts/locale-review/.storybook',
      '--output-dir',
      output,
      '--quiet',
      '--disable-telemetry',
    ]);
    await Bun.write(sceneFile, JSON.stringify(allScenes));
    await run([
      'node',
      'scripts/locale-review/scan.mjs',
      server.url.origin,
      sceneFile,
      index,
    ]);
    await Bun.write(stamp, hash);
    indexed = true;
  }
  const address = new URL(
    '/iframe.html?id=dev-locale-review--reviewer',
    server.url,
  );
  console.log(`Locale reviewer available at ${address.href}`);
  if (!options.includes('--no-open')) {
    const opener = {
      win32: ['rundll32.exe', 'url.dll,FileProtocolHandler'],
      darwin: ['open'],
      linux: ['xdg-open'],
    }[process.platform as 'win32' | 'darwin' | 'linux'];
    if (opener)
      Bun.spawn([...opener, address.href], {
        stdout: 'ignore',
        stderr: 'ignore',
      });
  }
} catch (error) {
  server.stop(true);
  throw error;
}
