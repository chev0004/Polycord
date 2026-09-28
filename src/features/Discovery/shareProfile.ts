import type { DiscoveryProfile } from './ProfileCard';

export const buildPublicProfileUrl = (
  locale: string,
  {
    id,
    discordUsername,
    allowAnonymousCopy,
  }: Pick<DiscoveryProfile, 'id' | 'discordUsername' | 'allowAnonymousCopy'>,
) =>
  allowAnonymousCopy && discordUsername
    ? `${window.location.origin}/${locale}/user/${encodeURIComponent(discordUsername)}`
    : `${window.location.origin}/${locale}/u/${id}`;
