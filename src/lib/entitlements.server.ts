import 'server-only';

import { getPremiumAccountByDiscordUserId, isPremiumAccount } from '@/db';
import type { CurrentUser } from './auth-session';
import { hasPremiumEntitlement } from './entitlements';

export const isPremiumUser = async (user: CurrentUser): Promise<boolean> => {
  if (hasPremiumEntitlement(user)) {
    return true;
  }

  const account = await getPremiumAccountByDiscordUserId(user.id);
  return (
    account !== null && isPremiumAccount(account.user, account.subscription)
  );
};
