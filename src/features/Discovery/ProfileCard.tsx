'use client';

import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useEffect, useState } from 'react';
import {
  MdAdd,
  MdBlock,
  MdBookmark,
  MdBookmarkBorder,
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
import type { AvailabilityPattern } from '@/constants/availability';
import {
  formatCurrentTime,
  getLanguageName,
  getProficiencyTranslationKey,
  type IANATimezone,
  type LanguageCode,
  type Proficiency,
  type TimeFormat,
} from '@/constants/languages';
import { trackClientEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { AvailabilityRow } from './AvailabilityRow';
import {
  type CardTheme,
  deriveCardAccent,
  FREE_ACCENT,
  getFreeCardTheme,
} from './cardTheme';
import { VoiceChip } from './VoiceChip';

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
  lastBumpedAt?: string;
  bumpedMinutesAgo?: number;
  premium?: boolean;
  cardTheme?: CardTheme;
  availability?: AvailabilityPattern;
  voiceIntroSeconds?: number;
};

type ProfileCardProps = {
  profile: DiscoveryProfile;
  variant?: 'discovery' | 'preview';
  isLoggedIn?: boolean;
  isSaved?: boolean;
  viewerTimezone?: string;
  bioFallback?: string;
  className?: string;
  emptyTagsLabel?: string;
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
  onToggleSave?: (profileId: string) => void;
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

const getBumpAge = (value?: string) => {
  if (!value) return null;

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );

  if (minutes < 1) return { key: 'bumpedJustNow' as const };
  if (minutes < 60) return { key: 'bumpedMinutesAgo' as const, count: minutes };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: 'bumpedHoursAgo' as const, count: hours };

  return { key: 'bumpedDaysAgo' as const, count: Math.floor(hours / 24) };
};

const getTimeFormat = (): TimeFormat => {
  if (typeof window === 'undefined') return '24hr';
  const stored = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
  return stored === '12hr' || stored === '24hr' ? stored : '24hr';
};

export const ProfileCard = ({
  profile,
  variant = 'discovery',
  isLoggedIn = false,
  isSaved = false,
  viewerTimezone,
  bioFallback,
  className,
  emptyTagsLabel,
  onCopyUsername,
  onTagClick,
  onLanguageClick,
  onCountryClick,
  onViewProfile,
  onReport,
  onBlock,
  onShare,
  onToggleSave,
}: ProfileCardProps) => {
  const t = useTranslations('Discovery');
  const tProfile = useTranslations('Profile');
  const locale = useLocale();
  const isPreview = variant === 'preview';
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() =>
    getTimeFormat(),
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const canCopyUsername =
    isPreview || profile.allowAnonymousCopy !== false || isLoggedIn;

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
  const bumpAge = getBumpAge(profile.lastBumpedAt);
  const lastBumpRelative =
    profile.lastBumpRelative ??
    (bumpAge ? t(bumpAge.key, { count: bumpAge.count ?? 0 }) : undefined);

  const handleCopyUsername = async () => {
    if (!canCopyUsername || isCopying) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(profile.discordUsername);
      setCopied(true);
      trackClientEvent(ANALYTICS_EVENTS.profileUsernameCopy);

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

  const visibleTargetLanguageCount = isPreview ? 2 : 1;
  const displayedTargetLanguages = profile.targetLanguages.slice(
    0,
    visibleTargetLanguageCount,
  );
  const remainingTargetLanguages = profile.targetLanguages.slice(
    visibleTargetLanguageCount,
  );
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
    onReport?.(profile.id);
    setIsMenuOpen(false);
  };

  const handleBlock = () => {
    onBlock?.(profile.id);
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

  const handleToggleSave = () => {
    onToggleSave?.(profile.id);
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
  ) => {
    const label = `${getLanguageName(language, locale)}${
      level ? ` / ${tProfile(getProficiencyTranslationKey(level))}` : ''
    }`;
    const classes = isPrimary
      ? primaryLanguagePillClasses
      : languagePillClasses;

    if (isPreview) {
      return (
        <span key={key} className={classes}>
          {label}
        </span>
      );
    }

    return (
      <button
        key={key}
        type="button"
        onClick={() => handleLanguageClick(language, level, isPrimary)}
        className={`${classes} cursor-pointer transition-opacity hover:opacity-80 active:opacity-60`}
      >
        {label}
      </button>
    );
  };

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

  const renderLocationContent = () => (
    <>
      <MdLocationOn
        className="flex-shrink-0 text-[var(--ct-accent,var(--color-primary))]"
        size={16}
      />
      <span>
        {profile.country
          ? t('locationValue', { location: profile.country })
          : ''}
        {currentTime ? (
          <Fragment>
            {' · '}
            {t('currentlyTime', { time: currentTime })}
          </Fragment>
        ) : null}
      </span>
    </>
  );

  const cardClassName = [
    'relative flex w-full flex-col gap-4 rounded-3xl bg-background-dark p-5 transition-transform duration-200',
    isPreview
      ? 'mb-0 border border-white/10 shadow-none'
      : `mb-6 shadow-lg ${
          isPopoverOpen || isMenuOpen
            ? '-translate-y-1 shadow-xl'
            : 'hover:-translate-y-1 hover:shadow-xl'
        }`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article style={themeStyle} className={cardClassName}>
      <div className="-mx-5 -mt-5 relative h-[84px] flex-shrink-0">
        <div
          className="flex h-16 items-center justify-end rounded-t-3xl px-2.5"
          style={{ background: theme.banner }}
        >
          <div className="flex items-center gap-1.5">
            {lastBumpRelative && (
              <span className="whitespace-nowrap rounded-full bg-black/30 px-[11px] py-[5px] font-semibold text-[11px] text-white/90 uppercase tracking-wide backdrop-blur-sm">
                {lastBumpRelative}
              </span>
            )}
            {!isPreview && (
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
                      <MenuItem
                        icon={MdPersonOutline}
                        onClick={handleViewProfile}
                      >
                        {t('viewProfile')}
                      </MenuItem>
                      {onToggleSave ? (
                        <MenuItem
                          icon={isSaved ? MdBookmark : MdBookmarkBorder}
                          onClick={handleToggleSave}
                          iconClassName={
                            isSaved
                              ? 'text-[var(--ct-accent,var(--color-primary))]'
                              : undefined
                          }
                        >
                          {isSaved ? t('unsaveProfile') : t('saveProfile')}
                        </MenuItem>
                      ) : null}
                      {(typeof navigator !== 'undefined' &&
                        typeof navigator.share === 'function') ||
                      !!onShare ? (
                        <MenuItem icon={MdShare} onClick={handleShare}>
                          {t('shareProfile')}
                        </MenuItem>
                      ) : null}
                      {onReport || onBlock ? (
                        <div className="my-1 h-[1px] bg-gray-500/50" />
                      ) : null}
                      {onReport ? (
                        <MenuItem
                          icon={MdFlag}
                          onClick={handleReport}
                          className="hover:!text-red-300 text-red-400"
                          iconClassName="text-red-400"
                        >
                          {t('reportProfile')}
                        </MenuItem>
                      ) : null}
                      {onBlock ? (
                        <MenuItem
                          icon={MdBlock}
                          onClick={handleBlock}
                          className="hover:!text-red-300 text-red-400"
                          iconClassName="text-red-400"
                        >
                          {t('blockProfile')}
                        </MenuItem>
                      ) : null}
                    </div>
                    <Popover.Arrow className="fill-gray-500/50" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
          </div>
        </div>

        <div
          className="absolute top-[29px] left-5 rounded-full bg-background-dark p-[7px]"
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
        {isPreview ? (
          <span className="flex items-center gap-1.5 self-start text-gray-400 text-xs">
            <MdContentCopy size={14} />
            <span>{t('copyUsername')}</span>
          </span>
        ) : canCopyUsername ? (
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

      {profile.availability && (
        <AvailabilityRow
          availability={profile.availability}
          ownerTimezone={profile.timezone}
          viewerTimezone={viewerTimezone}
        />
      )}

      {profile.premium && profile.voiceIntroSeconds ? (
        <VoiceChip seconds={profile.voiceIntroSeconds} />
      ) : null}

      <div className="flex h-full flex-col gap-4 rounded-3xl bg-background-darker p-4">
        {(profile.interests.length > 0 || isPreview) && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('tagsLabel')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {profile.interests.length > 0
                ? profile.interests.map((interest) =>
                    renderTag(interest, `${profile.id}-tag-${interest}`),
                  )
                : emptyTagsLabel && (
                    <span className="text-gray-500 text-xs">
                      {emptyTagsLabel}
                    </span>
                  )}
            </div>
          </section>
        )}

        {(profile.about || (isPreview && bioFallback)) && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('descriptionLabel')}
            </span>
            <p className="whitespace-pre-wrap break-words font-light text-gray-300 text-sm leading-normal">
              {profile.about || bioFallback}
            </p>
          </section>
        )}

        <div className="mt-auto flex flex-wrap items-start justify-between gap-3 text-gray-400 text-xs">
          <div className="flex flex-col gap-1">
            {profile.country && isPreview ? (
              <span className="flex items-center gap-1.5">
                {renderLocationContent()}
              </span>
            ) : null}
            {profile.country && !isPreview ? (
              <button
                type="button"
                onClick={handleCountryClick}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
              >
                {renderLocationContent()}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};
