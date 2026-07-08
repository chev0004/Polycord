import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deletePushSubscriptionsForUser,
  savePushSubscription,
  upsertDiscordUser,
} from '@/db';
import { getCurrentUser } from '@/lib/auth';

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1024),
    keys: z.object({
      p256dh: z.string().min(1).max(256),
      auth: z.string().min(1).max(256),
    }),
  }),
});

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
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await upsertDiscordUser(currentUser);
  await deletePushSubscriptionsForUser(user.id);

  return NextResponse.json({ deleted: true });
};
