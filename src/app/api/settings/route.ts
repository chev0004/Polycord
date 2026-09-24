import { NextResponse } from 'next/server';
import {
  updateProfilePrivacyForUser,
  updateUserEmail,
  upsertUserSettings,
} from '@/db';
import { settingsSchema } from '@/features/Settings/schema';
import { getActiveUser } from '@/lib/auth';

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

  await updateUserEmail(currentUser.accountId, values.email);
  await updateProfilePrivacyForUser(currentUser.accountId, {
    isPublic: values.isPublic,
    allowAnonymousCopy: values.allowAnonymousCopy,
    displayTimezone: values.displayTimezone,
  });
  await upsertUserSettings(currentUser.accountId, {
    theme: values.theme,
    applicationLanguage: values.applicationLanguage,
    timeFormat: values.timeFormat,
    languageDisplay: values.languageDisplay,
    activityStatus: values.activityStatus,
    matchAlert: values.matchAlert,
    profileInteractionAlert: values.profileInteractionAlert,
    profileViewAlert: values.profileViewAlert,
    hideProfileVisits: values.hideProfileVisits,
    productAnalytics: values.productAnalytics,
  });

  return NextResponse.json({ saved: true });
};
