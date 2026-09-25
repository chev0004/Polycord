import {
  formatTimezone,
  getLanguageName,
  proficiencyOptions,
} from '@/constants/languages';
import type { DiscoveryProfile } from './ProfileCard';

export const buildProfileSearchText = (
  profile: DiscoveryProfile,
  locale: string,
): string => {
  const proficiencyLabels = new Map(
    proficiencyOptions(locale).map((option) => [option.value, option.label]),
  );

  const levelLabel = (level?: string) =>
    level ? (proficiencyLabels.get(level) ?? level) : '';

  return [
    profile.displayName,
    profile.discordUsername,
    getLanguageName(profile.primaryLanguage, locale),
    levelLabel(profile.primaryLanguageLevel),
    profile.country ?? '',
    profile.timezone ?? '',
    profile.timezone ? formatTimezone(profile.timezone) : '',
    profile.about ?? '',
    profile.tags.join(' '),
    profile.targetLanguages
      .map(
        (language) =>
          `${getLanguageName(language.language, locale)} ${levelLabel(language.level)}`,
      )
      .join(' '),
  ]
    .join(' ')
    .toLowerCase();
};

export const applyDiscoverySearch = (
  profiles: DiscoveryProfile[],
  query: string,
  locale: string,
): DiscoveryProfile[] => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return profiles;
  }

  return profiles.filter((profile) =>
    buildProfileSearchText(profile, locale).includes(normalized),
  );
};
