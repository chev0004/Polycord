import 'server-only';

import {
  createNotification,
  getUserSettingsByUserId,
  hasRecentViewNotification,
  recordProfileInteraction,
} from '@/db';
import type { getCurrentUser } from '@/lib/auth';
import { hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';

const VIEW_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

type ProfileViewActor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export const notifyProfileView = async ({
  ownerUserId,
  actor,
}: {
  ownerUserId: string;
  actor: ProfileViewActor | null;
}): Promise<void> => {
  try {
    const windowStart = new Date(Date.now() - VIEW_DEDUPE_WINDOW_MS);
    const duplicate = await hasRecentViewNotification(
      ownerUserId,
      actor?.id ?? null,
      windowStart,
    );

    if (duplicate) {
      return;
    }

    await createNotification({
      userId: ownerUserId,
      kind: 'view',
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorAvatarUrl: actor?.avatarUrl ?? null,
      isGuest: actor === null,
    });
  } catch (error) {
    console.error('profile view notification failed', error);
  }
};

export type Viewer = Awaited<ReturnType<typeof getCurrentUser>>;

export const interactionActor = async (viewer: NonNullable<Viewer>) => {
  const [settings, premium] = await Promise.all([
    getUserSettingsByUserId(viewer.accountId),
    isPremiumUser(viewer),
  ]);

  return hasEntitlement('privacy.hiddenVisits', premium) &&
    settings?.hideProfileVisits
    ? null
    : {
        id: viewer.accountId,
        name: viewer.name,
        avatarUrl: viewer.avatarUrl ?? null,
      };
};

export const receiveProfileView = async ({
  ownerUserId,
  synthetic,
  viewer,
}: {
  ownerUserId: string;
  synthetic: boolean;
  viewer: Viewer;
}): Promise<void> => {
  if (synthetic || viewer?.accountId === ownerUserId) {
    return;
  }

  try {
    await recordProfileInteraction(ownerUserId, 'view');
    await notifyProfileView({
      ownerUserId,
      actor: viewer ? await interactionActor(viewer) : null,
    });
  } catch (error) {
    console.error('profile view failed', error);
  }
};
