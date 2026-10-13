import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getProfileByUserId,
  getPublicProfileById,
  listSavedProfileIds,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { getStaffRole } from '@/lib/admin';
import { gatedRoute } from '@/lib/gatedRoute';

export const GET = gatedRoute(
  async (
    { user },
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = z.uuid().safeParse((await params).id);
    const row = id.success
      ? await getPublicProfileById(id.data, user?.accountId)
      : null;

    if (!row) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const [viewerProfile, savedIds, role] = user
      ? await Promise.all([
          getProfileByUserId(user.accountId),
          listSavedProfileIds(user.accountId),
          getStaffRole(user),
        ])
      : [null, [], null];

    return NextResponse.json(
      {
        profile: mapProfileToDiscoveryProfile(row, Boolean(user)),
        isLoggedIn: Boolean(user),
        isSaved: savedIds.includes(row.profile.id),
        isOwn: viewerProfile?.profile.id === row.profile.id,
        viewerTimezone: viewerProfile
          ? toViewerAvailabilityContext(viewerProfile.profile).timezone
          : undefined,
        staff: user && role ? { meId: user.accountId, role } : undefined,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  },
);
