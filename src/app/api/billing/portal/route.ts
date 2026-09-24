import { NextResponse } from 'next/server';
import { getSubscriptionByUserId } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import {
  createCheckoutSession,
  createPortalSession,
  isBillingConfigured,
} from '@/lib/stripe';

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: 'Billing is not configured' },
      { status: 503 },
    );
  }

  let locale = 'en';

  try {
    const body = (await request.json()) as { locale?: string };
    if (typeof body.locale === 'string' && /^[a-z]{2}$/.test(body.locale)) {
      locale = body.locale;
    }
  } catch {}

  const origin = new URL(request.url).origin;
  const settingsUrl = `${origin}/${locale}/settings#premium`;
  const subscription = await getSubscriptionByUserId(currentUser.accountId);

  try {
    const url = subscription?.stripeCustomerId
      ? await createPortalSession({
          customerId: subscription.stripeCustomerId,
          returnUrl: settingsUrl,
        })
      : await createCheckoutSession({
          userId: currentUser.accountId,
          customerId: subscription?.stripeCustomerId,
          email: currentUser.email,
          successUrl: settingsUrl,
          cancelUrl: settingsUrl,
        });

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: 'Billing session failed' },
      { status: 502 },
    );
  }
};
