import { writeFile } from 'node:fs/promises';
import { createClient, workload } from './client.mjs';

const origin = process.argv[2];
if (
  origin &&
  !/^https:\/\/polycord-test006-[\w-]+\.netlify\.app$/.test(origin)
) {
  throw new Error('TEST-006 disposable Netlify origin required');
}
const results = [];
const kinds = ['discovery', 'page', 'ban'];
for (const driver of ['postgres', 'pg']) {
  for (const size of [1, 1, 1, 12, 60, 60, 60]) {
    const client = origin
      ? null
      : createClient(driver, process.env.DATABASE_URL);
    try {
      const outcomes = await Promise.all(
        Array.from({ length: size }, async (_, index) => {
          const kind =
            kinds[(size === 1 ? results.length : index) % kinds.length];
          const started = performance.now();
          try {
            if (origin) {
              const response = await fetch(
                `${origin}/.netlify/functions/driver-probe?driver=${driver}&kind=${kind}`,
                {
                  headers: {
                    authorization: `Bearer ${process.env.AUTH_SECRET}`,
                  },
                  signal: AbortSignal.timeout(10000),
                },
              );
              const data = await response.json();
              return {
                kind,
                status: response.status,
                ms: performance.now() - started,
                ...data,
              };
            }
            let timer;
            try {
              await Promise.race([
                workload(client, kind),
                new Promise((_, reject) => {
                  timer = setTimeout(
                    () => reject(new Error('Local deadline exceeded')),
                    10000,
                  );
                }),
              ]);
            } finally {
              clearTimeout(timer);
            }
            return { kind, status: 200, ms: performance.now() - started };
          } catch (error) {
            return {
              kind,
              status: 0,
              error: error.code ?? error.message,
              ms: performance.now() - started,
            };
          }
        }),
      );
      const times = outcomes.map(({ ms }) => ms).sort((a, b) => a - b);
      const result = {
        driver,
        size,
        ok: outcomes.filter(({ status }) => status === 200).length,
        p50: times[Math.floor(times.length * 0.5)],
        p95: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))],
        max: times.at(-1),
        outcomes,
      };
      results.push(result);
      console.log(JSON.stringify({ ...result, outcomes: undefined }));
    } finally {
      await client?.close();
    }
  }
}
await writeFile(
  process.argv[3] ?? 'test-results/test006-probes.json',
  JSON.stringify(
    { at: new Date().toISOString(), origin: origin ?? 'local', results },
    null,
    2,
  ),
);
