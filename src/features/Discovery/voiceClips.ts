const CACHE_LIMIT = 10;
const BATCH_SIZE = 12;
const BATCH_DELAY_MS = 150;

const urls = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const queue = new Map<string, (blob: Blob | null) => void>();
let scheduled = false;
let painted: Promise<void> | undefined;

const saveData = () =>
  Boolean(
    (navigator as { connection?: { saveData?: boolean } }).connection?.saveData,
  );

const afterPaint = () => {
  painted ??= new Promise((resolve) => {
    const seen = () =>
      performance.getEntriesByName('first-contentful-paint').length > 0;
    if (typeof PerformanceObserver === 'undefined' || seen()) return resolve();
    const observer = new PerformanceObserver(() => {
      if (!seen()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe({ type: 'paint', buffered: true });
  });
  return painted;
};

const afterIdle = () =>
  new Promise<void>((resolve) =>
    'requestIdleCallback' in window
      ? window.requestIdleCallback(() => resolve(), { timeout: 2000 })
      : setTimeout(resolve, 200),
  );

const toBlob = (mimeType: string, data: string) =>
  new Blob([Uint8Array.from(atob(data), (char) => char.charCodeAt(0))], {
    type: mimeType,
  });

const remember = (id: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const previous = urls.get(id);
  if (previous) URL.revokeObjectURL(previous);
  urls.delete(id);
  urls.set(id, url);
  for (const [oldest, oldestUrl] of urls) {
    if (urls.size <= CACHE_LIMIT) break;
    urls.delete(oldest);
    URL.revokeObjectURL(oldestUrl);
  }
  return url;
};

const track = (id: string, blob: Promise<Blob | null>) => {
  const url = blob
    .then((value) => (value ? remember(id, value) : null))
    .catch(() => null)
    .finally(() => pending.delete(id));
  pending.set(id, url);
  return url;
};

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, BATCH_DELAY_MS);
};

const flush = async () => {
  scheduled = false;
  const batch = [...queue].slice(0, BATCH_SIZE);
  for (const [id] of batch) queue.delete(id);
  if (queue.size) schedule();

  let clips: Record<string, { mimeType: string; data: string }> = {};
  try {
    const response = await fetch(
      `/api/voice?ids=${batch.map(([id]) => id).join(',')}`,
      { cache: 'no-store' },
    );
    if (response.ok) clips = (await response.json()).clips;
  } catch {}
  for (const [id, resolve] of batch) {
    const clip = clips[id];
    resolve(clip ? toBlob(clip.mimeType, clip.data) : null);
  }
};

export const peekClip = (id: string) => {
  const url = urls.get(id);
  if (url) {
    urls.delete(id);
    urls.set(id, url);
  }
  return url;
};

export const pendingClip = (id: string) => pending.get(id);

export const ensureClip = (id: string) => {
  const url = peekClip(id);
  if (url) return Promise.resolve(url);
  return (
    pending.get(id) ??
    track(
      id,
      fetch(`/api/voice/${id}`, { cache: 'no-store' }).then((response) =>
        response.ok ? response.blob() : null,
      ),
    )
  );
};

export const prefetchClip = async (id: string) => {
  if (saveData() || urls.has(id) || pending.has(id)) return;
  await afterPaint();
  await afterIdle();
  if (urls.has(id) || pending.has(id)) return;
  track(id, new Promise((resolve) => queue.set(id, resolve)));
  schedule();
};

export const preloadClip = (id: string) => {
  if (!saveData()) void ensureClip(id);
};

export const clearClips = () => {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
};
