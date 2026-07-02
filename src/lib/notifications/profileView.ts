import 'server-only';

import { createNotification, hasRecentViewNotification } from '@/db';

const VIEW_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

type ProfileViewActor = {
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
      actor?.name ?? null,
      windowStart,
    );

    if (duplicate) {
      return;
    }

    await createNotification({
      userId: ownerUserId,
      kind: 'view',
      actorName: actor?.name ?? null,
      actorAvatarUrl: actor?.avatarUrl ?? null,
      isGuest: actor === null,
    });
  } catch (error) {
    console.error('profile view notification failed', error);
  }
};
