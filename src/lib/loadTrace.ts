import 'server-only';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

import { hasOwnerDevToggle } from './devSettings';

export type LoadMeasure = <T>(
  name: string,
  run: () => Promise<T>,
) => Promise<T>;

export const createLoadTrace = async (request: Request) => {
  const cookies = new RequestCookies(request.headers);
  if (!(await hasOwnerDevToggle((name) => cookies.get(name)?.value, 'trace')))
    return null;
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
