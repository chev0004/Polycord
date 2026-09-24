import { NextResponse } from 'next/server';
import { deleteAccountByUserId, getSubscriptionByUserId } from '@/db';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { cancelStripeSubscription } from '@/lib/stripe';

export const DELETE = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('confirmation' in body) ||
    body.confirmation !== 'DELETE'
  ) {
    return NextResponse.json(
      { error: 'Confirmation required' },
      { status: 400 },
    );
  }

  const subscription = await getSubscriptionByUserId(currentUser.accountId);
  if (
    subscription?.stripeSubscriptionId &&
    !['canceled', 'incomplete_expired'].includes(subscription.status)
  ) {
    try {
      await cancelStripeSubscription(subscription.stripeSubscriptionId);
    } catch {
      return NextResponse.json(
        {
          error: 'Billing cancellation failed. Please retry account deletion.',
        },
        { status: 502 },
      );
    }
  }

  const deleted = await deleteAccountByUserId(currentUser.accountId);
  const response = NextResponse.json({ deleted });
  clearSessionCookie(response);

  return response;
};
