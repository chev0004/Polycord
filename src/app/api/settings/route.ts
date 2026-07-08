import { NextResponse } from 'next/server';
import {
  updateProfilePrivacyForUser,
  updateUserEmail,
  upsertDiscordUser,
  upsertUserSettings,
} from '@/db';
import { settingsSchema } from '@/features/Settings/schema';
import { getCurrentUser } from '@/lib/auth';

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

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
    activityStatus: values.activityStatus,
    pushNotifications: values.pushNotifications,
    matchAlert: values.matchAlert,
    profileInteractionAlert: values.profileInteractionAlert,
    profileViewAlert: values.profileViewAlert,
    productAnalytics: values.productAnalytics,
  });

  return NextResponse.json({ saved: true });
};
