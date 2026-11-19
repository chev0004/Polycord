import { spawnSync } from 'node:child_process';
import config from '../playwright.config';

const { env } = config.webServer as { env: Record<string, string> };
process.exitCode =
  spawnSync('bun', ['run', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  }).status ?? 1;
