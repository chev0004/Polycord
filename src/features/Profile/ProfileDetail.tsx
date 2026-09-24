'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { countryOptions } from '@/constants/countries';
import {
  capitalizeLanguageCode,
  getLanguageName,
  getProficiencyTranslationKey,
  isValidLanguageCode,
} from '@/constants/languages';
import { AvailabilityRow } from '@/features/Discovery/AvailabilityRow';
import {
  deriveCardAccent,
  FREE_ACCENT,
  getFreeCardTheme,
} from '@/features/Discovery/cardTheme';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { VoiceChip } from '@/features/Discovery/VoiceChip';
import { useLanguageDisplay } from '@/features/Settings/LanguageDisplay';

type ProfileDetailProps = {
  profile: DiscoveryProfile;
  isLoggedIn?: boolean;
  isSaved?: boolean;
  isSaving?: boolean;
  viewerTimezone?: string;
  onCopyUsername: () => void;
  onShare: () => void;
  onToggleSave?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  onEdit?: () => void;
  onSignIn: () => void;
  onTagClick: (tag: string) => void;
  onLanguageClick: (language: string, isPrimary: boolean) => void;
  onCountryClick: (country: string) => void;
};

export const ProfileDetail = ({
  profile,
  isLoggedIn,
  isSaved,
  isSaving,
  viewerTimezone,
  onCopyUsername,
  onShare,
  onToggleSave,
  onReport,
  onBlock,
  onEdit,
  onSignIn,
  onTagClick,
  onLanguageClick,
  onCountryClick,
}: ProfileDetailProps) => {
  const t = useTranslations('PublicProfile');
  const tDiscovery = useTranslations('Discovery');
  const tProfile = useTranslations('Profile');
  const locale = useLocale();
  const languageDisplay = useLanguageDisplay();
  const theme = profile.cardTheme ?? getFreeCardTheme(2);
  const canCopy = isLoggedIn || profile.allowAnonymousCopy !== false;
  const countryName =
    countryOptions(locale).find(({ value }) => value === profile.country)
      ?.label ?? profile.country;
  const languages = [
    {
      language: profile.primaryLanguage,
      level: profile.primaryLanguageLevel,
      isPrimary: true,
    },
    ...profile.targetLanguages.map((language) => ({
      ...language,
      isPrimary: false,
    })),
  ];

  return (
    <article
      className="overflow-hidden rounded-3xl bg-background-dark"
      style={deriveCardAccent(profile.premium ? theme.accent : FREE_ACCENT)}
    >
      <div className="h-28 sm:h-40" style={{ background: theme.banner }} />
      <div className="px-5 pb-7 sm:px-8 sm:pb-9">
        <header className="-mt-12 relative flex min-w-0 flex-col items-start gap-5">
          <div className="rounded-full bg-background-dark p-2">
            <Avatar avatarUrl={profile.avatarUrl} size="lg" />
          </div>
          <h1 className="max-w-full break-words font-figtree font-semibold text-3xl text-foreground sm:text-4xl">
            {profile.displayName}
          </h1>
          <div className="flex flex-wrap gap-3">
            {canCopy ? (
              <Button onClick={onCopyUsername}>
                {tDiscovery('copyUsername')}
              </Button>
            ) : (
              <Button onClick={onSignIn}>
                {tDiscovery('signInToViewUsername')}
              </Button>
            )}
            {onToggleSave ? (
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={onToggleSave}
              >
                {isSaved
                  ? tDiscovery('unsaveProfile')
                  : tDiscovery('saveProfile')}
              </Button>
            ) : null}
            <Button variant="outline" onClick={onShare}>
              {tDiscovery('shareProfile')}
            </Button>
            {onEdit ? (
              <Button variant="outline" onClick={onEdit}>
                {tProfile('editProfile')}
              </Button>
            ) : null}
          </div>
        </header>
        <div className="mt-8 grid min-w-0 gap-8 md:grid-cols-2">
          <section className="min-w-0" aria-labelledby="profile-languages">
            <h2
              id="profile-languages"
              className="mb-4 font-semibold text-foreground text-lg"
            >
              {t('languages')}
            </h2>
            <ul className="flex flex-col gap-3">
              {languages.map(({ language, level, isPrimary }) => (
                <li key={`${isPrimary}-${language}`}>
                  <button
                    type="button"
                    onClick={() => onLanguageClick(language, isPrimary)}
                    className="w-full rounded-xl bg-background-darker p-4 text-left hover:bg-background-main focus-visible:bg-background-main"
                  >
                    <span className="block text-muted text-xs">
                      {isPrimary
                        ? tProfile('primaryLanguageLabel')
                        : tProfile('targetLanguageLabel')}
                    </span>
                    <span className="mt-1 block break-words font-medium text-foreground">
                      {languageDisplay === 'short' &&
                      isValidLanguageCode(language)
                        ? capitalizeLanguageCode(language)
                        : getLanguageName(language, locale)}
                    </span>
                    {level ? (
                      <span className="mt-1 block text-sm text-soft">
                        {tProfile(getProficiencyTranslationKey(level))}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <div className="flex min-w-0 flex-col gap-7">
            <section aria-labelledby="profile-about">
              <h2
                id="profile-about"
                className="mb-3 font-semibold text-foreground text-lg"
              >
                {tProfile('aboutMe')}
              </h2>
              <p className="whitespace-pre-wrap break-words text-soft leading-relaxed">
                {profile.about}
              </p>
            </section>
            {profile.interests.length ? (
              <section aria-labelledby="profile-interests">
                <h2
                  id="profile-interests"
                  className="mb-3 font-semibold text-foreground text-lg"
                >
                  {tProfile('tagsLabel')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onClick={() => onTagClick(tag)}
                      className="max-w-full break-words"
                    />
                  ))}
                </div>
              </section>
            ) : null}
            {profile.availability ? (
              <section aria-labelledby="profile-availability">
                <h2
                  id="profile-availability"
                  className="mb-3 font-semibold text-foreground text-lg"
                >
                  {t('availability')}
                </h2>
                <AvailabilityRow
                  availability={profile.availability}
                  ownerTimezone={profile.timezone}
                  viewerTimezone={viewerTimezone}
                  expanded
                />
              </section>
            ) : null}
            {profile.country ? (
              <section aria-labelledby="profile-country">
                <h2
                  id="profile-country"
                  className="mb-2 font-semibold text-foreground text-lg"
                >
                  {tProfile('countryLabel')}
                </h2>
                <button
                  type="button"
                  onClick={() => onCountryClick(profile.country as string)}
                  className="max-w-full break-words py-2 text-soft underline-offset-4 hover:underline focus-visible:underline"
                >
                  {countryName}
                </button>
              </section>
            ) : null}
            {profile.voiceIntroSeconds ? (
              <section aria-labelledby="profile-voice">
                <h2
                  id="profile-voice"
                  className="mb-3 font-semibold text-foreground text-lg"
                >
                  {tProfile('voiceIntroTitle')}
                </h2>
                <VoiceChip
                  seconds={profile.voiceIntroSeconds}
                  src={`/api/voice/${profile.id}`}
                />
              </section>
            ) : null}
          </div>
        </div>
        {onReport || onBlock ? (
          <div className="mt-8 flex flex-wrap gap-5 border-line border-t pt-5 text-muted text-sm">
            {onReport ? (
              <button
                type="button"
                onClick={onReport}
                className="py-2 hover:text-foreground focus-visible:text-foreground"
              >
                {tDiscovery('reportProfile')}
              </button>
            ) : null}
            {onBlock ? (
              <button
                type="button"
                onClick={onBlock}
                className="py-2 hover:text-foreground focus-visible:text-foreground"
              >
                {tDiscovery('blockProfile')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};
