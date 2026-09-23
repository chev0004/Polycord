import { NextResponse } from 'next/server';
import {
  updateProfilePrivacyForUser,
  updateUserEmail,
  upsertDiscordUser,
  upsertUserSettings,
} from '@/db';
import { settingsSchema } from '@/features/Settings/schema';
import { getActiveUser } from '@/lib/auth';
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

export const PATCH = async (request: Request) => {
  const payload = settingsSchema
    .pick({ applicationLanguage: true })
    .safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }
  const currentUser = await getActiveUser();
  if (currentUser) {
    const user = await upsertDiscordUser(currentUser);
    await upsertUserSettings(user.id, payload.data);
  }
  return savedResponse(payload.data.applicationLanguage);
};

export const POST = async (request: Request) => {
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
  const user = await upsertDiscordUser(currentUser);

  await updateUserEmail(user.id, values.email);
  await updateProfilePrivacyForUser(user.id, {
    isPublic: values.isPublic,
    allowAnonymousCopy: values.allowAnonymousCopy,
    displayTimezone: values.displayTimezone,
  });
  await upsertUserSettings(user.id, {
    theme: values.theme,
    applicationLanguage: values.applicationLanguage,
    timeFormat: values.timeFormat,
    languageDisplay: values.languageDisplay,
    profileInteractionAlert: values.profileInteractionAlert,
    profileViewAlert: values.profileViewAlert,
    hideProfileVisits: values.hideProfileVisits,
    productAnalytics: values.productAnalytics,
  });

  return savedResponse(values.applicationLanguage);
};
