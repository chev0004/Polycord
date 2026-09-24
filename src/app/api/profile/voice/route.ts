import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteVoiceIntroForUser, upsertVoiceIntroForUser } from '@/db';
import { getActiveUser } from '@/lib/auth';
import { hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';
import { inspectVoiceMedia } from '@/lib/voiceMedia';

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
  audio: z.string().min(1).max(1400000),
});

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

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

  let media: Awaited<ReturnType<typeof inspectVoiceMedia>>;
  try {
    media = await inspectVoiceMedia(Buffer.from(base64, 'base64'));
  } catch {
    return NextResponse.json(
      { error: 'Invalid audio content or duration' },
      { status: 400 },
    );
  }

  const saved = await upsertVoiceIntroForUser(currentUser.accountId, {
    ...media,
    sizeBytes,
    data: base64,
  });
  if (!saved) {
    return NextResponse.json(
      { error: 'Save your profile before adding a voice intro' },
      { status: 409 },
    );
  }

  return NextResponse.json({ durationSeconds: media.durationSeconds });
};

export const DELETE = async () => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteVoiceIntroForUser(currentUser.accountId);

  return NextResponse.json({ deleted: true });
};
