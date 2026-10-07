const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { builtinModules } = require('node:module');
const { join, resolve } = require('node:path');
const { build } = require('esbuild');

module.exports = {
  async onBuild({ constants }) {
    const manifest = JSON.parse(
      await readFile(
        join(constants.PUBLISH_DIR, 'prerender-manifest.json'),
        'utf8',
      ),
    );
    const documents = {};
    for (const locale of ['en', 'ja']) {
      if (manifest.routes[`/${locale}`]?.initialRevalidateSeconds !== false) {
        throw new Error(`Discovery shell /${locale} must be fully prerendered`);
      }
      documents[locale] = await readFile(
        join(constants.PUBLISH_DIR, `server/app/${locale}.html`),
        'utf8',
      );
    }
    const documentPath = resolve('.netlify/discovery-documents.json');
    await mkdir('.netlify/edge-functions', { recursive: true });
    await writeFile(documentPath, JSON.stringify(documents));
    const root = resolve(__dirname, '../..');
    const builtins = new Set(
      builtinModules.map((name) => name.replace(/^node:/, '')),
    );
    await build({
      stdin: {
        contents: `import { serveDiscoveryDocument } from ${JSON.stringify(join(root, 'src/lib/discoveryDocument.ts'))}; import documents from ${JSON.stringify(documentPath)}; export default (request, context) => serveDiscoveryDocument(request, context, documents);`,
        resolveDir: root,
        loader: 'ts',
      },
      outfile: '.netlify/edge-functions/polycord-discovery-shell.js',
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'es2022',
      minify: true,
      define: { 'process.env': 'polycordEnv' },
      banner: {
        js: 'import { createRequire } from "node:module"; import process from "node:process"; import { Buffer } from "node:buffer"; import { setImmediate, clearImmediate } from "node:timers"; const global = globalThis; const require = createRequire(import.meta.url); const polycordEnv = new Proxy({}, { get: (_, name) => typeof name === "string" ? Netlify.env.get(name) : undefined });',
      },
      external: ['pg-native'],
      plugins: [
        {
          name: 'edge-builtins',
          setup(builder) {
            builder.onResolve({ filter: /.*/ }, (args) =>
              builtins.has(args.path)
                ? { path: `node:${args.path}`, external: true }
                : undefined,
            );
            builder.onResolve({ filter: /^server-only$/ }, () => ({
              path: 'server-only',
              namespace: 'empty',
            }));
            builder.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({
              contents: '',
              loader: 'js',
            }));
          },
        },
      ],
    });
    const path = '.netlify/edge-functions/manifest.json';
    const declarations = JSON.parse(await readFile(path, 'utf8'));
    const nextMiddleware = declarations.functions.find(
      (item) => item.function === '___netlify-edge-handler-node-middleware',
    );
    if (!nextMiddleware)
      throw new Error('Next middleware declaration is missing');
    const pattern = '^/((en|ja)(?:\\.rsc)?/?)?$';
    nextMiddleware.excludedPattern = pattern;
    declarations.functions.unshift({
      function: 'polycord-discovery-shell',
      pattern,
      name: 'Guarded Discovery Shell',
      generator: 'polycord-discovery-shell',
    });
    await writeFile(path, JSON.stringify(declarations));
  },
};
