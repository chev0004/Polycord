import { AsyncLocalStorage } from 'node:async_hooks';

const enabled = process.env.DISC029_TIMING === 'true';
const instance = crypto.randomUUID();
const timings = new AsyncLocalStorage<Record<string, number>>();

export const probeFailure = (error: unknown): Record<string, string> => {
  if (!enabled) return {};
  const message = error instanceof Error ? error.message : '';
  const code = (error as { code?: string })?.code;
  const category = /max client connections reached/i.test(message)
    ? 'client-limit'
    : /too many clients|remaining connection slots/i.test(message)
      ? 'connection-limit'
      : /timeout|timed out/i.test(message)
        ? 'timeout'
        : /password authentication|sasl/i.test(message)
          ? 'authentication'
          : /certificate|tls|ssl/i.test(message)
            ? 'tls'
            : 'unknown';
  return {
    'X-Disc029-Failure': category,
    'X-Disc029-Code':
      typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code)
        ? code
        : 'unknown',
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
