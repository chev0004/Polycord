'use client';

import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useEffect, useState } from 'react';
import {
  MdAdd,
  MdBlock,
  MdCheck,
  MdContentCopy,
  MdFlag,
  MdLocationOn,
  MdMoreVert,
  MdPersonOutline,
  MdShare,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import {
  formatCurrentTime,
  getLanguageName,
  getProficiencyTranslationKey,
  type IANATimezone,
  type LanguageCode,
  type Proficiency,
  type TimeFormat,
} from '@/constants/languages';
import {
  type CardTheme,
  deriveCardAccent,
  FREE_ACCENT,
  getFreeCardTheme,
} from './cardTheme';

export type DiscoveryTargetLanguage = {
  language: LanguageCode | string;
  level?: Proficiency | string;
  goal?: string;
};

export type DiscoveryProfile = {
  id: string;
  displayName: string;
  discordUsername: string;
  avatarUrl?: string;
  primaryLanguage: LanguageCode | string;
  primaryLanguageLevel?: Proficiency | string;
  targetLanguages: DiscoveryTargetLanguage[];
  about?: string;
  interests: string[];
  country?: string;
  timezone?: IANATimezone | string;
  allowAnonymousCopy?: boolean;
  lastBumpRelative?: string;
  premium?: boolean;
  cardTheme?: CardTheme;
};

type ProfileCardProps = {
  profile: DiscoveryProfile;
  isLoggedIn?: boolean;
  onCopyUsername?: (
    username: string,
    profileId: string,
    avatarUrl?: string,
  ) => void;
  onTagClick?: (tag: string, profileId: string) => void;
  onLanguageClick?: (
    language: string,
    level: string | undefined,
    isPrimary: boolean,
    profileId: string,
  ) => void;
  onCountryClick?: (country: string, profileId: string) => void;
  onViewProfile?: (profileId: string) => void;
  onReport?: (profileId: string) => void;
  onBlock?: (profileId: string) => void;
  onShare?: (profileId: string) => void;
};

const baseLanguagePillClasses =
  'rounded-md px-2.5 py-[5px] text-xs font-medium whitespace-nowrap flex-shrink-0';
const languagePillClasses = `${baseLanguagePillClasses} bg-background-darker text-gray-200`;
const primaryLanguagePillClasses = `${baseLanguagePillClasses} bg-[var(--ct-chip-bg,var(--color-primary-darker))] text-[var(--ct-chip-text,#fff)]`;

// The card surface and avatar ring layer the premium tint over the dark
// card colour; the transparent fallback keeps free cards untouched.
const tintedSurface =
  'linear-gradient(var(--card-tint,transparent),var(--card-tint,transparent)),var(--color-background-dark)';

const TIME_FORMAT_STORAGE_KEY = 'polycord_timeFormat';

const getTimeFormat = (): TimeFormat => {
  if (typeof window === 'undefined') return '24hr';
  const stored = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
  return stored === '12hr' || stored === '24hr' ? stored : '24hr';
};

export const ProfileCard = ({
  profile,
  isLoggedIn = false,
  onCopyUsername,
  onTagClick,
  onLanguageClick,
  onCountryClick,
  onViewProfile,
  onReport,
  onBlock,
  onShare,
}: ProfileCardProps) => {
  const t = useTranslations('Discovery');
  const tProfile = useTranslations('Profile');
  const locale = useLocale();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() =>
    getTimeFormat(),
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const canCopyUsername = profile.allowAnonymousCopy !== false || isLoggedIn;

  const theme = profile.cardTheme ?? getFreeCardTheme(2);
  // Free profiles always use the neutral slate accent regardless of
  // banner colour; only premium themes carry their own accent.
  const accent = profile.premium ? theme.accent : FREE_ACCENT;
  const themeStyle = {
    ...deriveCardAccent(accent),
    ...(profile.premium && theme.tint
      ? { '--card-tint': theme.tint, background: tintedSurface }
      : {}),
  } as React.CSSProperties;

  const handleCopyUsername = async () => {
    if (!canCopyUsername || isCopying) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(profile.discordUsername);
      setCopied(true);

      if (onCopyUsername) {
        onCopyUsername(profile.discordUsername, profile.id, profile.avatarUrl);
      }

      setTimeout(() => {
        setCopied(false);
        setIsCopying(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy username:', err);
      setIsCopying(false);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setTimeFormat(getTimeFormat());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timeFormatChanged', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timeFormatChanged', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (profile.timezone) {
        const formatted = formatCurrentTime(profile.timezone, timeFormat);
        setCurrentTime(formatted);
      } else {
        setCurrentTime('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [profile.timezone, timeFormat]);

  const displayedTargetLanguages = profile.targetLanguages.slice(0, 1);
  const remainingTargetLanguages = profile.targetLanguages.slice(1);
  const remainingLanguagesCount = remainingTargetLanguages.length;

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag, profile.id);
    }
  };

  const handleLanguageClick = (
    language: string,
    level: string | undefined,
    isPrimary: boolean,
  ) => {
    if (onLanguageClick) {
      onLanguageClick(language, level, isPrimary, profile.id);
    }
  };

  const handleCountryClick = () => {
    if (profile.country && onCountryClick) {
      onCountryClick(profile.country, profile.id);
    }
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(profile.id);
    } else {
      console.log('View profile:', profile.id);
    }
    setIsMenuOpen(false);
  };

  const handleReport = () => {
    if (onReport) {
      onReport(profile.id);
    } else {
      console.log('Report profile:', profile.id);
    }
    setIsMenuOpen(false);
  };

  const handleBlock = () => {
    if (onBlock) {
      onBlock(profile.id);
    } else {
      console.log('Block profile:', profile.id);
    }
    setIsMenuOpen(false);
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(profile.id);
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: profile.displayName,
          text: `Check out ${profile.displayName}'s profile on Polycord`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    }
    setIsMenuOpen(false);
  };

  const renderTag = (value: string, key?: string) => (
    <Chip key={key} label={value} onClick={() => handleTagClick(value)} />
  );

  const renderLanguagePill = (
    language: LanguageCode | string,
    level: Proficiency | string | undefined,
    isPrimary: boolean,
    key?: string,
  ) => (
    <button
      key={key}
      type="button"
      onClick={() => handleLanguageClick(language, level, isPrimary)}
      className={`${isPrimary ? primaryLanguagePillClasses : languagePillClasses} cursor-pointer transition-opacity hover:opacity-80 active:opacity-60`}
    >
      {getLanguageName(language, locale)}
      {level ? ` · ${tProfile(getProficiencyTranslationKey(level))}` : ''}
    </button>
  );

  const MenuItem = ({
    icon: Icon,
    onClick,
    children,
    className,
    iconClassName,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    iconClassName?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-background-main/50 ${className || 'text-white'}`}
    >
      <Icon size={20} className={iconClassName || 'text-gray-400'} />
      {children}
    </button>
  );

  return (
    <article
      style={themeStyle}
      className={`flex h-full w-full max-w-sm flex-col gap-4 rounded-3xl bg-background-dark p-5 shadow-lg transition-transform duration-200 ${
        isPopoverOpen || isMenuOpen
          ? '-translate-y-1 shadow-xl'
          : 'hover:-translate-y-1 hover:shadow-xl'
      }`}
    >
      <div
        className="-mx-5 -mt-5 flex h-16 flex-shrink-0 items-center justify-end rounded-t-3xl px-2.5"
        style={{ background: theme.banner }}
      >
        <div className="flex items-center gap-1.5">
          {profile.lastBumpRelative && (
            <span className="whitespace-nowrap rounded-full bg-black/30 px-[11px] py-[5px] font-semibold text-[11px] text-white/90 uppercase tracking-wide backdrop-blur-sm">
              {profile.lastBumpRelative}
            </span>
          )}
          <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                suppressHydrationWarning
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/30 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
                aria-label={t('cardMenu')}
              >
                <MdMoreVert size={17} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="PopoverContent z-50 w-[200px] rounded-lg border-[1px] border-gray-500/50 bg-background-dark p-1 shadow-lg"
                side="bottom"
                align="end"
                sideOffset={5}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="flex flex-col gap-1">
                  <MenuItem icon={MdPersonOutline} onClick={handleViewProfile}>
                    {t('viewProfile')}
                  </MenuItem>
                  {(typeof navigator !== 'undefined' &&
                    typeof navigator.share === 'function') ||
                  !!onShare ? (
                    <MenuItem icon={MdShare} onClick={handleShare}>
                      {t('shareProfile')}
                    </MenuItem>
                  ) : null}
                  <div className="my-1 h-[1px] bg-gray-500/50" />
                  <MenuItem
                    icon={MdFlag}
                    onClick={handleReport}
                    className="hover:!text-red-300 text-red-400"
                    iconClassName="text-red-400"
                  >
                    {t('reportProfile')}
                  </MenuItem>
                  <MenuItem
                    icon={MdBlock}
                    onClick={handleBlock}
                    className="hover:!text-red-300 text-red-400"
                    iconClassName="text-red-400"
                  >
                    {t('blockProfile')}
                  </MenuItem>
                </div>
                <Popover.Arrow className="fill-gray-500/50" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      {/* -mt pulls the ring up so its centre lands on the banner's bottom
          edge; -mb cancels the ring's bottom padding so the avatar-to-name
          gap equals the card's 16px rhythm. */}
      <div className="-mt-[51px] -mb-[7px] self-start">
        <div
          className="rounded-full bg-background-dark p-[7px]"
          style={
            profile.premium && theme.tint
              ? { background: tintedSurface }
              : undefined
          }
        >
          <Avatar avatarUrl={profile.avatarUrl} size="md" />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-[3px]">
        <h3 className="truncate font-figtree font-semibold text-lg text-white">
          {profile.displayName}
        </h3>
        {canCopyUsername ? (
          <button
            type="button"
            onClick={handleCopyUsername}
            className="group flex items-center gap-1.5 self-start text-left transition-colors"
            aria-label={t('copyUsername')}
          >
            <div
              className={`flex items-center justify-center transition-all duration-200 ${
                copied
                  ? 'scale-110 text-discord-blue-light'
                  : 'text-gray-400 group-hover:text-white'
              }`}
            >
              {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
            </div>
            <span
              className={`truncate text-xs transition-colors duration-200 ${
                copied
                  ? 'font-medium text-discord-blue-light'
                  : 'text-gray-400 group-hover:text-white'
              }`}
            >
              {copied ? t('copied') : t('copyUsername')}
            </span>
          </button>
        ) : (
          <span className="truncate text-gray-500 text-xs">
            {t('signInToViewUsername')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {renderLanguagePill(
          profile.primaryLanguage,
          profile.primaryLanguageLevel,
          true,
          `${profile.id}-primary`,
        )}
        {displayedTargetLanguages.map((lang) =>
          renderLanguagePill(
            lang.language,
            lang.level,
            false,
            `${profile.id}-${lang.language}-target`,
          ),
        )}
        {remainingLanguagesCount > 0 && (
          <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                suppressHydrationWarning
                className="inline-flex items-center gap-0.5 rounded-md bg-background-darker px-[9px] py-[5px] font-medium text-[11px] text-gray-300 transition-colors hover:bg-background-main/50 hover:text-white"
                aria-label={t('showMoreLanguages', {
                  count: remainingLanguagesCount,
                })}
              >
                <MdAdd size={14} />
                {remainingLanguagesCount}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="PopoverContent z-50 w-[240px] rounded-lg border-[1px] border-gray-500/50 bg-background-dark p-3 shadow-lg"
                side="bottom"
                align="start"
                sideOffset={5}
              >
                <div className="flex flex-wrap gap-2">
                  {remainingTargetLanguages.map((lang, index) =>
                    renderLanguagePill(
                      lang.language,
                      lang.level,
                      false,
                      `${profile.id}-remaining-${lang.language}-${index}`,
                    ),
                  )}
                </div>
                <Popover.Arrow className="fill-gray-500/50" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {/* Voice chip slot (UIR-026) renders here, between the language
          pills and the availability row. */}
      {/* Availability row slot (UIR-022) renders here, above the body. */}

      <div className="flex h-full flex-col gap-4 rounded-3xl bg-background-darker p-4">
        {profile.interests.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('tagsLabel')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {profile.interests
                .slice(0, 4)
                .map((interest) =>
                  renderTag(interest, `${profile.id}-tag-${interest}`),
                )}
              {profile.interests.length > 4 && (
                <span className="rounded-md bg-background-main px-2 py-1 text-[11px] text-gray-400">
                  +{profile.interests.length - 4}
                </span>
              )}
            </div>
          </section>
        )}

        {profile.about && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('descriptionLabel')}
            </span>
            <p className="whitespace-pre-wrap break-words font-light text-gray-300 text-sm leading-normal">
              {profile.about}
            </p>
          </section>
        )}

        <div className="mt-auto flex flex-wrap items-start justify-between gap-3 text-gray-400 text-xs">
          <div className="flex flex-col gap-1">
            {profile.country && (
              <button
                type="button"
                onClick={handleCountryClick}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
              >
                <MdLocationOn
                  className="flex-shrink-0 text-[var(--ct-accent,var(--color-primary))]"
                  size={16}
                />
                <span>
                  {t('locationValue', { location: profile.country })}
                  {currentTime ? (
                    <Fragment>
                      {' · '}
                      {t('currentlyTime', { time: currentTime })}
                    </Fragment>
                  ) : null}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
