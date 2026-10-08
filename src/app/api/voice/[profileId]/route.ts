import {
  getProfileById,
  getPublicProfileById,
  getVoiceIntroByUserId,
} from '@/db';
import { getActiveUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import { gatedRoute } from '@/lib/gatedRoute';

export const GET = gatedRoute(
  async (
    { user: currentUser, measure },
    _request: Request,
    { params }: { params: Promise<{ profileId: string }> },
  ) => {
    const { profileId } = await params;
    let row = await measure('profile', () =>
      getPublicProfileById(profileId, currentUser?.accountId),
    );

    if (!row && currentUser) {
      const candidate = await getProfileById(profileId);

      if (
        candidate?.profile.userId === currentUser.accountId &&
        (await getActiveUser())
      ) {
        row = candidate;
      }
    }

    if (!row?.profile.voiceIntroSeconds) {
      return new Response('Not found', { status: 404 });
    }

    const { profile, user: owner } = row;
    const ownerPremium = await measure('premium', () =>
      isPremiumUser({ id: owner.discordUserId, name: owner.displayName }),
    );

    if (!ownerPremium) {
      return new Response('Not found', { status: 404 });
    }

    const intro = await measure('voice', () =>
      getVoiceIntroByUserId(profile.userId),
    );

    if (!intro) {
      return new Response('Not found', { status: 404 });
    }

    const bytes = Buffer.from(intro.data, 'base64');

    return new Response(bytes, {
      headers: {
        'Content-Type': intro.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, no-store',
      },
    });
  },
);
