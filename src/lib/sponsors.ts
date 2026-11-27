import 'server-only';

import type { DiscoverySponsors } from '@/constants/sponsors';
import { listLiveSponsors } from '@/db';
import type { CurrentUser } from './auth-session';
import { isPremiumUser } from './entitlements.server';

const shuffle = <T>(items: T[]) =>
  items
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);

const imageUrl = (id: string, variant: 'image' | 'phone') =>
  `/api/sponsors/${id}/${variant}`;

export const loadDiscoverySponsors = async (
  user: CurrentUser | null,
  locale: string,
): Promise<DiscoverySponsors | null> => {
  if (user && (await isPremiumUser(user))) return null;
  const live = await listLiveSponsors();
  const toSponsor = ({ id, url, altEn, altJa }: (typeof live)[number]) => ({
    id,
    url,
    alt: locale === 'ja' ? altJa : altEn,
    image: imageUrl(id, 'image'),
  });
  const banner = live.find(({ tier }) => tier === 'banner');
  return {
    banner: banner
      ? { ...toSponsor(banner), phoneImage: imageUrl(banner.id, 'phone') }
      : null,
    cards: shuffle(live.filter(({ tier }) => tier === 'card').map(toSponsor)),
  };
};
