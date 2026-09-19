import { z } from 'zod';
import {
  getProfileById,
  getPublicProfileById,
  getUserByDiscordId,
  getVoiceIntroByUserId,
} from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) => {
  const { profileId } = await params;
  if (!z.uuid().safeParse(profileId).success) {
    return new Response('Not found', { status: 404 });
  }
  let row = await getPublicProfileById(profileId);

  if (!row) {
    const currentUser = await getCurrentUser();
    const viewer = currentUser
      ? await getUserByDiscordId(currentUser.id)
      : null;
    const candidate = viewer ? await getProfileById(profileId) : null;

    if (candidate && viewer && candidate.profile.userId === viewer.id) {
      row = candidate;
    }
  }

  if (!row?.profile.voiceIntroSeconds) {
    return new Response('Not found', { status: 404 });
  }

  const ownerPremium = await isPremiumUser({
    id: row.user.discordUserId,
    name: row.user.displayName,
  });

  if (!ownerPremium) {
    return new Response('Not found', { status: 404 });
  }

  const intro = await getVoiceIntroByUserId(row.profile.userId);

  if (!intro) {
    return new Response('Not found', { status: 404 });
  }

  const bytes = Buffer.from(intro.data, 'base64');

  return new Response(bytes, {
    headers: {
      'Content-Type': intro.mimeType,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, max-age=300',
    },
  });
};
