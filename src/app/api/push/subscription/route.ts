import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deletePushSubscriptionsForUser,
  getUserSettingsByUserId,
  listPushSubscriptionsForUser,
  savePushSubscription,
  upsertDiscordUser,
} from '@/db';
import { getActiveUser } from '@/lib/auth';
import { isPushConfigured, isPushEndpoint } from '@/lib/push/server';

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1024).refine(isPushEndpoint),
    keys: z.object({
      p256dh: z.string().min(1).max(256),
      auth: z.string().min(1).max(256),
    }),
  }),
});

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isPushConfigured())
    return NextResponse.json(
      { error: 'Push is not configured' },
      { status: 503 },
    );

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = subscriptionSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json(
      { error: 'Invalid subscription' },
      { status: 400 },
    );
  }

  const user = await upsertDiscordUser(currentUser);
  const { subscription } = payload.data;

  await savePushSubscription(user.id, {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });

  return NextResponse.json({ saved: true });
};

export const DELETE = async () => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await upsertDiscordUser(currentUser);
  await deletePushSubscriptionsForUser(user.id);

  return NextResponse.json({ deleted: true });
};

export const GET = async () => {
  const currentUser = await getActiveUser();
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await upsertDiscordUser(currentUser);
  const [settings, subscriptions] = await Promise.all([
    getUserSettingsByUserId(user.id),
    listPushSubscriptionsForUser(user.id),
  ]);
  return NextResponse.json({
    enabled: settings?.pushNotifications ?? false,
    endpoints: subscriptions.map((subscription) => subscription.endpoint),
  });
};
