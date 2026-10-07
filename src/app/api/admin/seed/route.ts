import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addDummies, countAccounts, removeDummies } from '@/db';
import { scopedRoute } from '@/db/client';
import { isSameOrigin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { getSeedStatus } from '@/lib/seed/access';
import { SEED_CAP } from '@/lib/seed/limits';

const notFound = () =>
  NextResponse.json({ error: 'Not found' }, { status: 404 });

const targetSchema = z.object({
  target: z.number().int().min(0).max(SEED_CAP),
});

export const GET = scopedRoute(async () => {
  const status = await getSeedStatus(await getCurrentUser());
  return status ? NextResponse.json(status) : notFound();
});

export const POST = scopedRoute(async (request: Request) => {
  const user = await getCurrentUser();
  if (!(await getSeedStatus(user))) return notFound();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = targetSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  }

  const { target } = body.data;
  const { dummies } = await countAccounts();
  if (target > dummies) await addDummies(target - dummies);
  if (target < dummies) await removeDummies(dummies - target);

  return NextResponse.json(await getSeedStatus(user));
});
