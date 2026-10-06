import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import ca from '../../src/db/supabaseCa.json' with { type: 'json' };
import { createClient, workload } from './client.mjs';
import { sandboxOrigin, sandboxResource } from './resources.mjs';

const origin = process.argv[2];
const resource = sandboxResource(process.env.SESSION_DATABASE_URL);
if (origin) sandboxOrigin(origin, resource);
const results = [];
const monitor = postgres(process.env.SESSION_DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 3,
  ssl: { ca, rejectUnauthorized: true },
});
const samples = [];
const sample = async () => {
  const [row] =
    await monitor`select count(*)::int as connections,count(*) filter(where state='active')::int as active,count(*) filter(where state='idle in transaction')::int as idle_transactions from pg_stat_activity where datname=current_database() and usename='postgres'`;
  samples.push({ at: new Date().toISOString(), ...row });
};
await sample();
const sampling = setInterval(() => sample().catch(() => {}), 250);
const kinds = ['discovery', 'page', 'ban'];
for (const driver of (process.env.PROBE_DRIVERS ?? 'postgres,pg').split(',')) {
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
                ...data,
                serverMs: data.ms,
                kind,
                status: response.status,
                ms: performance.now() - started,
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
        poolSize: Number(process.env.PROBE_POOL_SIZE ?? 1),
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
clearInterval(sampling);
await sample();
await monitor.end({ timeout: 0 });
await writeFile(
  process.argv[3] ?? 'test-results/test006-probes.json',
  JSON.stringify(
    {
      at: new Date().toISOString(),
      origin: origin ?? 'local',
      results,
      samples,
    },
    null,
    2,
  ),
);
