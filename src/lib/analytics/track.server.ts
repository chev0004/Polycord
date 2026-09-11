import 'server-only';

import { getUserSettingsByUserId, insertAnalyticsEvent } from '@/db';
import type { AnalyticsEventName } from './events';
import { type AnalyticsMetadata, sanitizeMetadata } from './metadata';

const analyticsGloballyEnabled = () =>
  process.env.POLYCORD_ANALYTICS_DISABLED !== 'true';

type TrackEventInput = {
  name: AnalyticsEventName;
  userId?: string | null;
  anonymousId?: string | null;
  locale?: string | null;
  metadata?: AnalyticsMetadata;
};

export const trackEvent = async ({
  name,
  userId,
  anonymousId,
  locale,
  metadata,
}: TrackEventInput): Promise<void> => {
  try {
    if (!analyticsGloballyEnabled()) {
      return;
    }

    if (userId) {
      const settings = await getUserSettingsByUserId(userId);

      if (settings && !settings.productAnalytics) {
        return;
      }
    }

    await insertAnalyticsEvent({
      name,
      userId: userId ?? null,
      anonymousId: anonymousId ?? null,
      locale: locale ?? null,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    console.error('analytics trackEvent failed', error);
  }
};
