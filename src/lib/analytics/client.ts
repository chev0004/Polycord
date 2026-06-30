import type { AnalyticsEventName } from './events';

export const trackClientEvent = (
  name: AnalyticsEventName,
  metadata?: Record<string, unknown>,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const body = JSON.stringify({
      name,
      locale: document.documentElement.lang || undefined,
      metadata,
    });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(
        '/api/analytics',
        new Blob([body], { type: 'application/json' }),
      );
      return;
    }

    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {}
};
