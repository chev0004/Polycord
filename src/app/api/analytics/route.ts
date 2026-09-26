import { NextResponse } from 'next/server';
import { getProfileByUserId, getUserByDiscordId } from '@/db';
import {
  ANALYTICS_EVENTS,
  isClientAnalyticsEvent,
} from '@/lib/analytics/events';
import { localeFromPath } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';

const noContent = () => new NextResponse(null, { status: 204 });

export const POST = async (request: Request) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return noContent();
  }

  if (!body || typeof body !== 'object') {
    return noContent();
  }

  const { name, locale, metadata } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !isClientAnalyticsEvent(name)) {
    return noContent();
  }

  const currentUser = await getCurrentUser();
  let userId: string | null = null;

  if (currentUser) {
    const user = await getUserByDiscordId(currentUser.id);
    userId = user?.id ?? null;
  }

  if (name === ANALYTICS_EVENTS.profileUsernameCopy) {
    const profileId =
      metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>).profileId
        : undefined;
    const ownProfile = userId ? await getProfileByUserId(userId) : null;

    if (typeof profileId !== 'string' || ownProfile?.profile.id === profileId) {
      return noContent();
    }
  }

  await trackEvent({
    name,
    userId,
    locale: typeof locale === 'string' ? localeFromPath(`/${locale}`) : null,
    metadata:
      metadata && typeof metadata === 'object'
        ? (metadata as Record<string, unknown>)
        : undefined,
  });

  return noContent();
};
