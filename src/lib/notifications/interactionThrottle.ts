import 'server-only';

import { consumeRateLimit } from '@/db';
import { getRateLimit } from '@/lib/rateLimit';

export const allowInteractionNotification = async ({
  kind,
  ownerUserId,
  actorUserId,
  ip,
}: {
  kind: 'copy' | 'share';
  ownerUserId: string;
  actorUserId?: string;
  ip: string | null;
}): Promise<boolean> => {
  const subject = `${actorUserId ? `user:${actorUserId}` : `ip:${ip ?? 'unknown'}`}>${ownerUserId}`;
  const perKind = getRateLimit('notify-kind');
  const perActor = getRateLimit('notify-actor');
  const kindResult = await consumeRateLimit(
    `notify-kind:${kind}`,
    subject,
    perKind.max,
    perKind.windowMs,
  );

  if (!kindResult.allowed) {
    return false;
  }

  const actorResult = await consumeRateLimit(
    'notify-actor',
    subject,
    perActor.max,
    perActor.windowMs,
  );

  return actorResult.allowed;
};
