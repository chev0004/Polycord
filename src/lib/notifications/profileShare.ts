import 'server-only';

import { createNotification, recordProfileInteraction } from '@/db';
import { allowInteractionNotification } from './interactionThrottle';
import { interactionActor, type Viewer } from './profileView';

export const receiveProfileShare = async ({
  ownerUserId,
  synthetic,
  viewer,
  ip,
}: {
  ownerUserId: string;
  synthetic: boolean;
  viewer: Viewer;
  ip: string | null;
}): Promise<boolean> => {
  if (synthetic || viewer?.accountId === ownerUserId) {
    return false;
  }

  await recordProfileInteraction(ownerUserId, 'share');

  if (
    !(await allowInteractionNotification({
      kind: 'share',
      ownerUserId,
      actorUserId: viewer?.accountId,
      ip,
    }))
  ) {
    return false;
  }

  const actor = viewer ? await interactionActor(viewer) : null;
  const notification = await createNotification({
    userId: ownerUserId,
    kind: 'share',
    actorUserId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    actorAvatarUrl: actor?.avatarUrl ?? null,
    isGuest: viewer === null,
  });

  return notification !== null;
};
