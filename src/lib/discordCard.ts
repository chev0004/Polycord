import 'server-only';
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

export const discordCardFor = (row: PublicProfileRow) => {
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
      time: profile.timezone ? formatCurrentTime(profile.timezone) : undefined,
      locale: 'en',
      labels: ENGLISH_CARD_LABELS,
    }),
  };
};

export const discordCardImagePath = (row: PublicProfileRow) => {
  const updated = Math.max(
    row.profile.updatedAt.getTime(),
    row.user.updatedAt.getTime(),
  );
  const { layout } = discordCardFor(row);
  return `/api/discord-card/${row.profile.id}?v=${updated.toString(36)}-${layout}`;
};
