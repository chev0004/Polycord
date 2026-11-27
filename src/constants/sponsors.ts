export const SPONSOR_TIERS = ['card', 'banner'] as const;

export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const SPONSOR_LIMITS: Record<SponsorTier, number> = {
  card: 3,
  banner: 1,
};

export const SPONSOR_IMAGE_SIZES = {
  card: { width: 1080, height: 1350 },
  banner: { width: 2400, height: 300 },
  phone: { width: 1200, height: 300 },
} as const;

export type SponsorImageSlot = keyof typeof SPONSOR_IMAGE_SIZES;

export const SPONSOR_IMAGE_MAX_BYTES = 1024 * 1024;

export const SPONSOR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export type DiscoverySponsor = {
  id: string;
  url: string;
  alt: string;
  image: string;
};

export type DiscoveryBanner = DiscoverySponsor & { phoneImage: string };

export type DiscoverySponsors = {
  banner: DiscoveryBanner | null;
  cards: DiscoverySponsor[];
};
