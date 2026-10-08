import {
  getProfileById,
  getVoiceIntroByUserId,
  listPlayableVoiceIntros,
} from '@/db';
import { getActiveUser } from '@/lib/auth';
import type { CurrentUser } from '@/lib/auth-session';
import { parseByteRange } from '@/lib/byteRange';
import { isPremiumUser } from '@/lib/entitlements.server';
import { gatedRoute } from '@/lib/gatedRoute';

const loadOwnIntro = async (
  profileId: string,
  currentUser: CurrentUser & { accountId: string },
) => {
  const row = await getProfileById(profileId);

  if (
    row?.profile.userId !== currentUser.accountId ||
    !row.profile.voiceIntroSeconds ||
    !(await getActiveUser()) ||
    !(await isPremiumUser({
      id: row.user.discordUserId,
      name: row.user.displayName,
    }))
  ) {
    return null;
  }

  return getVoiceIntroByUserId(row.profile.userId);
};

export const GET = gatedRoute(
  async (
    { user: currentUser, measure },
    request: Request,
    { params }: { params: Promise<{ profileId: string }> },
  ) => {
    const { profileId } = await params;
    const [shared] = await measure('voice', () =>
      listPlayableVoiceIntros([profileId], currentUser?.accountId),
    );
    const intro =
      shared ??
      (currentUser
        ? await measure('own', () => loadOwnIntro(profileId, currentUser))
        : null);

    if (!intro) {
      return new Response('Not found', { status: 404 });
    }

    const bytes = Buffer.from(intro.data, 'base64');
    const headers = {
      'Content-Type': intro.mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
    };
    const range = parseByteRange(request.headers.get('range'), bytes.length);

    if (range === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${bytes.length}` },
      });
    }

    if (!range) {
      return new Response(bytes, {
        headers: { ...headers, 'Content-Length': String(bytes.length) },
      });
    }

    const slice = bytes.subarray(range.start, range.end + 1);
    return new Response(slice, {
      status: 206,
      headers: {
        ...headers,
        'Content-Length': String(slice.length),
        'Content-Range': `bytes ${range.start}-${range.end}/${bytes.length}`,
      },
    });
  },
);
