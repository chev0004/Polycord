import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createProxy } from './proxy.mjs';

const proxy = await createProxy(process.env.SESSION_DATABASE_URL);
const started = Date.now();
try {
  for (const name of [
    'ban-lookup',
    'discovery',
    'restriction',
    'safety',
    'account',
  ]) {
    const { stdout } = await promisify(execFile)(
      'bun',
      ['--no-env-file', `tests/integration/${name}.mjs`],
      {
        env: {
          ...process.env,
          TEST_DATABASE_URL: proxy.url,
          DATABASE_URL: proxy.url,
          AUTH_SECRET: process.env.AUTH_SECRET,
        },
        timeout: 90000,
      },
    );
    console.log(JSON.stringify({ name, stdout }));
  }
  console.log(
    `TEST-006 local integration checks passed in ${Date.now() - started}ms`,
  );
} finally {
  await proxy.close();
}
