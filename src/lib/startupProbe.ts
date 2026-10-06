import { AsyncLocalStorage } from 'node:async_hooks';

const enabled = process.env.DISC029_TIMING === 'true';
const instance = crypto.randomUUID();
const timings = new AsyncLocalStorage<Record<string, number>>();

export const measureStartup = async <T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!enabled) return operation();
  const started = performance.now();
  try {
    return await operation();
  } finally {
    const current = timings.getStore();
    if (current)
      current[name] = (current[name] ?? 0) + performance.now() - started;
  }
};

export const startupResponse = async <T extends Response>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> => {
  if (!enabled) return operation();
  return timings.run({}, async () => {
    const response = await measureStartup(name, operation);
    const metrics = Object.entries(timings.getStore() as Record<string, number>)
      .map(([key, value]) => `${key};dur=${value.toFixed(2)}`)
      .join(', ');
    response.headers.append(
      name === 'middleware' ? 'Server-Timing' : 'X-Disc029-Timing',
      `${name}-instance;desc="${instance}", ${metrics}`,
    );
    if (name === 'middleware')
      response.headers.set(
        'X-Disc029-Transport',
        process.env.POLYCORD_DIRECT_BAN_CHECK === 'true' ? 'direct' : 'https',
      );
    else response.headers.set('X-Disc029-Node', process.version);
    return response;
  });
};
