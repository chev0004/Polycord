import { build } from 'bun';

const result = await build({
  entrypoints: ['./netlify/ban-check.ts'],
  outdir: './netlify/functions',
  naming: 'ban-check.mjs',
  target: 'node',
  conditions: ['react-server'],
  external: ['pg-native'],
  env: 'disable',
  minify: true,
});

if (!result.success)
  throw new AggregateError(result.logs, 'Ban check build failed');
