import { NextResponse } from 'next/server';
import { getPremiumAccountByDiscordUserId, getPremiumSource } from '@/db';
import { scopedRoute } from '@/db/client';
import { getCurrentUser } from '@/lib/auth';
import {
  createCheckoutSession,
  createPortalSession,
  isBillingConfigured,
} from '@/lib/stripe';

export const POST = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await getPremiumAccountByDiscordUserId(currentUser.id);
  const subscription = account?.subscription ?? null;
  if (account && getPremiumSource(account.user, subscription) === 'granted') {
    return NextResponse.json(
      { error: 'An active Supporter grant cannot start or manage billing' },
      { status: 403 },
    );
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
  const settingsUrl = `${origin}/${locale}/settings#supporter`;

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
});
