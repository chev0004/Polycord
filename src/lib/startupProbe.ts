import { AsyncLocalStorage } from 'node:async_hooks';

const enabled = process.env.DISC027_TIMING === 'true';
const instance = crypto.randomUUID();
const timings = new AsyncLocalStorage<Record<string, number>>();

export const observeDuration = (name: string, duration: number) => {
  const current = timings.getStore();
  if (current) current[name] = (current[name] ?? 0) + duration;
};

export const captureDuration = (name: string) => {
  const current = timings.getStore();
  const started = performance.now();
  return () => {
    if (current)
      current[name] = (current[name] ?? 0) + performance.now() - started;
  };
};

export const measureStartup = async <T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!enabled) return operation();
  const started = performance.now();
  try {
    return await operation();
  } finally {
    observeDuration(name, performance.now() - started);
  }
};

export const startupResponse = async <T extends Response>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!enabled) return operation();
  const initial: Record<string, number> = {};
  if (typeof process.uptime === 'function')
    initial[`${name}-uptime`] = process.uptime() * 1000;
  return timings.run(initial, async () => {
    const response = await measureStartup(name, operation);
    const metrics = Object.entries(timings.getStore() as Record<string, number>)
      .map(([key, value]) =>
        key === 'sql-count'
          ? `${key};desc="${value}"`
          : `${key};dur=${value.toFixed(2)}`,
      )
      .join(', ');
    response.headers.append(
      'Server-Timing',
      `${name}-instance;desc="${instance}", ${metrics}`,
    );
    return response;
  });
};
