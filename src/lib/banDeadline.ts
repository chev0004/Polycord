const LOOKUP_DEADLINE_MS = 3000;

export const withBanDeadline = async <T>(
  run: (signal: AbortSignal) => Promise<T>,
) => {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Ban lookup timed out'));
    }, LOOKUP_DEADLINE_MS);
  });

  try {
    return await Promise.race([run(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
};
