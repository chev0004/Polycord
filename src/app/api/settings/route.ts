import { NextResponse } from 'next/server';
import {
  updateProfilePrivacyForUser,
  updateUserEmail,
  upsertUserSettings,
} from '@/db';
import { scopedRoute } from '@/db/client';
import { settingsSchema } from '@/features/Settings/schema';
import { isOwner } from '@/lib/admin';
import { getActiveUser, setDevCookie } from '@/lib/auth';
import type { locales } from '@/utils/locales';

const savedResponse = (locale: (typeof locales)[number]) => {
  const response = NextResponse.json({ saved: true });
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 31536000,
  });
  return response;
};

export const PATCH = scopedRoute(async (request: Request) => {
  const payload = settingsSchema
    .pick({ applicationLanguage: true })
    .safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }
  const currentUser = await getActiveUser();
  if (currentUser) {
    await upsertUserSettings(currentUser.accountId, payload.data);
  }
  return savedResponse(payload.data.applicationLanguage);
});

export const POST = scopedRoute(async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = settingsSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json(
      { error: 'Invalid settings', issues: payload.error.issues },
      { status: 400 },
    );
  }

  const values = payload.data;
  const owner = isOwner(currentUser);

  if (
    !owner &&
    (values.loadTracing !== undefined || values.discoverySkeleton !== undefined)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await updateUserEmail(currentUser.accountId, values.email);
  await updateProfilePrivacyForUser(currentUser.accountId, {
    isPublic: values.isPublic,
    allowAnonymousCopy: values.allowAnonymousCopy,
    displayTimezone: values.displayTimezone,
  });
  await upsertUserSettings(currentUser.accountId, {
    applicationLanguage: values.applicationLanguage,
    timeFormat: values.timeFormat,
    languageDisplay: values.languageDisplay,
    profileInteractionAlert: values.profileInteractionAlert,
    profileViewAlert: values.profileViewAlert,
    hideProfileVisits: values.hideProfileVisits,
    productAnalytics: values.productAnalytics,
    loadTracing: values.loadTracing,
    discoverySkeleton: values.discoverySkeleton,
  });

  const response = savedResponse(values.applicationLanguage);
  if (owner) {
    setDevCookie(response, {
      loadTracing: values.loadTracing ?? false,
      discoverySkeleton: values.discoverySkeleton ?? false,
    });
  }
  return response;
});
