import { execFileSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const results = [];
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
for (const route of ['api/internal/ban-check', 'api/discovery']) {
  const entry = resolve(`.next/server/app/${route}/route.js`);
  const trace = JSON.parse(await readFile(`${entry}.nft.json`, 'utf8'));
  const sizes = await Promise.all(
    trace.files.map(
      async (file) => (await stat(resolve(dirname(entry), file))).size,
    ),
  );
  const samples = Array.from({ length: 12 }, () =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--conditions=react-server',
          '-e',
          `const started=performance.now();require(${JSON.stringify(entry)});
          console.log(JSON.stringify({ms:performance.now()-started,uptimeMs:process.uptime()*1000,
          heapBytes:process.memoryUsage().heapUsed,externalModules:Object.keys(require.cache).length,
          pushLoaded:Object.keys(require.cache).some(path=>path.includes('web-push'))}));`,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            NODE_ENV: 'production',
            DATABASE_URL: 'postgres://unused:unused@127.0.0.1:1/unused',
            AUTH_SECRET: 'disc027-disposable-local-build',
            DISC027_TIMING: 'false',
          },
        },
      ).trim(),
    ),
  );
  const times = samples.map(({ ms }) => ms).sort((a, b) => a - b);
  results.push({
    route,
    tracedFiles: sizes.length,
    tracedBytes: sizes.reduce((sum, size) => sum + size, 0),
    p50: times[6],
    p95: times[11],
    samples,
  });
}
await writeFile(
  process.argv[2],
  JSON.stringify(
    { at: new Date().toISOString(), commit, node: process.version, results },
    null,
    2,
  ),
);
console.log(JSON.stringify(results.map(({ samples, ...result }) => result)));
