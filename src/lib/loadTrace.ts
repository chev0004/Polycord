import 'server-only';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

import {
  AUTH_SESSION_COOKIE,
  readSessionFromCookieValue,
} from './auth-session';
import { isOwnerDiscordId } from './ownerIds';

export type LoadMeasure = <T>(
  name: string,
  run: () => Promise<T>,
) => Promise<T>;

export const createLoadTrace = async (request: Request) => {
  if (
    process.env.POLYCORD_ENVIRONMENT !== 'staging' ||
    process.env.POLYCORD_LOAD_TRACE_ENABLED !== 'true' ||
    process.env.POLYCORD_PUBLIC_URL
  )
    return null;
  const cookie = new RequestCookies(request.headers).get(
    AUTH_SESSION_COOKIE,
  )?.value;
  const session = cookie ? await readSessionFromCookieValue(cookie) : null;
  if (!session || !isOwnerDiscordId(session.id)) return null;
  const started = performance.now();
  const spans: Record<string, number> = {};
  const measure: LoadMeasure = async (name, run) => {
    const start = performance.now();
    try {
      return await run();
    } finally {
      spans[name] = (spans[name] ?? 0) + performance.now() - start;
    }
  };
  return {
    measure,
    spans,
    headers: (kind: 'gate' | 'handler') => {
      spans[kind] = performance.now() - started;
      return {
        'Server-Timing': Object.entries(spans)
          .map(([name, duration]) => `pc_${name};dur=${duration.toFixed(1)}`)
          .join(', '),
      };
    },
  };
};

export const measureLoad: LoadMeasure = async (_name, run) => run();
