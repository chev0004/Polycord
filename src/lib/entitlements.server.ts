import 'server-only';

import { getSubscriptionByDiscordUserId, isSubscriptionActive } from '@/db';
import type { CurrentUser } from './auth-session';
import { hasPremiumEntitlement } from './entitlements';

export const isPremiumUser = async (user: CurrentUser): Promise<boolean> => {
  if (hasPremiumEntitlement(user)) {
    return true;
  }

  return isSubscriptionActive(await getSubscriptionByDiscordUserId(user.id));
};
