import 'server-only';
import { createHash } from 'node:crypto';
import { resolveDiscordCard } from '@/constants/discordCards';
import { formatCurrentTime } from '@/constants/languages';
import { type getPublicProfileById, mapProfileToDiscoveryProfile } from '@/db';
import { getFreeCardTheme } from '@/features/Discovery/cardTheme';
import {
  buildDiscordCardData,
  ENGLISH_CARD_LABELS,
} from '@/features/Profile/DiscordCard/data';

type PublicProfileRow = NonNullable<
  Awaited<ReturnType<typeof getPublicProfileById>>
>;

const imageAvatar = (url?: string) =>
  url?.replace(/\.gif\?/, '.png?').replace(/size=\d+/, 'size=512');

export const discordCardFor = (row: PublicProfileRow, now = new Date()) => {
  const profile = mapProfileToDiscoveryProfile(row);
  const theme = profile.cardTheme ?? getFreeCardTheme(0);

  return {
    layout: resolveDiscordCard(
      row.profile.discordCard,
      Boolean(profile.premium),
    ),
    banner: theme.banner,
    accent: theme.accent,
    data: buildDiscordCardData({
      name: profile.displayName,
      handle: profile.discordUsername,
      avatarUrl: imageAvatar(profile.avatarUrl),
      primaryLanguage: profile.primaryLanguage,
      targetLanguages: profile.targetLanguages,
      tags: profile.tags,
      availability: profile.availability,
      country: profile.country,
      time: profile.timezone
        ? formatCurrentTime(profile.timezone, '24hr', 'en', now)
        : undefined,
      locale: 'en',
      labels: ENGLISH_CARD_LABELS,
    }),
  };
};

const DISCORD_CARD_DESIGN = 1;

export const discordCardVersion = (row: PublicProfileRow) => {
  const updated = Math.max(
    row.profile.updatedAt.getTime(),
    row.user.updatedAt.getTime(),
  );
  const { layout, banner, accent, data } = discordCardFor(row);
  const look = createHash('sha256')
    .update(JSON.stringify([banner, accent, data.avatarUrl]))
    .digest('base64url')
    .slice(0, 8);
  return `${updated.toString(36)}-${layout}-${look}-${DISCORD_CARD_DESIGN}`;
};

export const discordCardExtension = ({
  layout,
  data,
}: ReturnType<typeof discordCardFor>) =>
  layout === 'now-playing' || data.targets.length > 1 ? 'gif' : 'png';

export const discordCardImagePath = (row: PublicProfileRow, now = new Date()) =>
  `/api/discord-card/${row.profile.id}/${discordCardVersion(row)}/${Math.floor(now.getTime() / 60000)}.${discordCardExtension(discordCardFor(row))}`;
