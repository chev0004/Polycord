import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deleteVoiceIntroForUser,
  upsertDiscordUser,
  upsertVoiceIntroForUser,
} from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';

const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
];

const MAX_SIZE_BYTES = 1024 * 1024;

const voiceIntroSchema = z.object({
  mimeType: z
    .string()
    .refine(
      (value) => ALLOWED_MIME_TYPES.includes(value.split(';')[0].trim()),
      { message: 'unsupported type' },
    ),
  durationSeconds: z.number().int().min(1).max(20),
  audio: z.string().min(1),
});

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const premium = await isPremiumUser(currentUser);

  if (!hasEntitlement('profile.voiceIntro', premium)) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = voiceIntroSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid voice intro' }, { status: 400 });
  }

  const base64 = payload.data.audio.replace(/^data:[^,]+,/, '');
  let sizeBytes: number;

  try {
    sizeBytes = Buffer.from(base64, 'base64').byteLength;
  } catch {
    return NextResponse.json({ error: 'Invalid audio data' }, { status: 400 });
  }

  if (sizeBytes === 0 || sizeBytes > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
  }

  const user = await upsertDiscordUser(currentUser);

  await upsertVoiceIntroForUser(user.id, {
    mimeType: payload.data.mimeType.split(';')[0].trim(),
    durationSeconds: payload.data.durationSeconds,
    sizeBytes,
    data: base64,
  });

  return NextResponse.json({ durationSeconds: payload.data.durationSeconds });
};

export const DELETE = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await upsertDiscordUser(currentUser);
  await deleteVoiceIntroForUser(user.id);

  return NextResponse.json({ deleted: true });
};
