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
import { ActionSheet, type ActionSheetItem } from '@/components/Sheet';
import type { AvailabilityPattern } from '@/constants/availability';
import {
  capitalizeLanguageCode,
  formatCurrentTime,
  getLanguageName,
  getProficiencyTranslationKey,
  type IANATimezone,
  isValidLanguageCode,
  type LanguageCode,
  type Proficiency,
} from '@/constants/languages';
import { useLanguageDisplay } from '@/features/Settings/LanguageDisplay';
import { useTimeFormat } from '@/features/Settings/TimeFormat';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { trackClientEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { copyText } from '@/lib/clipboard';
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
};

export type DiscoveryProfile = {
  id: string;
  displayName: string;
  discordUsername?: string;
  avatarUrl?: string;
  primaryLanguage: LanguageCode | string;
  primaryLanguageLevel?: Proficiency | string;
  targetLanguages: DiscoveryTargetLanguage[];
  about?: string;
  tags: string[];
  country?: string;
  timezone?: IANATimezone | string;
  allowAnonymousCopy?: boolean;
  lastBumpRelative?: string;
  lastBumpedAt?: string;
  bumpedMinutesAgo?: number;
  boosted?: boolean;
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
    avatarUrl: string | undefined,
    copiedToClipboard: boolean,
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
const languagePillClasses = `${baseLanguagePillClasses} bg-background-darker text-soft`;
const primaryLanguagePillClasses = `${baseLanguagePillClasses} bg-[var(--ct-chip-bg,var(--color-primary-darker))] text-[var(--ct-chip-text,var(--color-foreground))]`;
const tintedSurface =
  'linear-gradient(var(--card-tint,transparent),var(--card-tint,transparent)),var(--color-background-dark)';

export const getBumpAge = (value?: string) => {
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
  const mobile = useIsMobile();
  const timeFormat = useTimeFormat();
  const languageDisplay = useLanguageDisplay();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const canCopyUsername =
    isPreview || profile.allowAnonymousCopy !== false || isLoggedIn;

  const theme = profile.cardTheme ?? getFreeCardTheme(2);
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
    if (!canCopyUsername || isCopying || !profile.discordUsername) return;

    setIsCopying(true);
    setCopyFailed(false);
    const copiedToClipboard = await copyText(profile.discordUsername);
    trackClientEvent(ANALYTICS_EVENTS.profileUsernameCopy);
    onCopyUsername?.(
      profile.discordUsername,
      profile.id,
      profile.avatarUrl,
      copiedToClipboard,
    );

    if (!copiedToClipboard) {
      setCopyFailed(true);
      setIsCopying(false);
      return;
    }

    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsCopying(false);
    }, 2000);
  };

  useEffect(() => {
    const updateTime = () => {
      if (profile.timezone) {
        const formatted = formatCurrentTime(
          profile.timezone,
          timeFormat,
          locale,
        );
        setCurrentTime(formatted);
      } else {
        setCurrentTime('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [profile.timezone, timeFormat, locale]);

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

  const menuItems: ActionSheetItem[] = [
    onViewProfile && {
      key: 'view',
      icon: MdPersonOutline,
      label: t('viewProfile'),
      onSelect: () => onViewProfile(profile.id),
    },
    onToggleSave && {
      key: 'save',
      icon: isSaved ? MdBookmark : MdBookmarkBorder,
      label: isSaved ? t('unsaveProfile') : t('saveProfile'),
      onSelect: () => onToggleSave(profile.id),
    },
    onShare && {
      key: 'share',
      icon: MdShare,
      label: t('shareProfile'),
      onSelect: () => onShare(profile.id),
    },
    onReport && {
      key: 'report',
      icon: MdFlag,
      label: t('reportProfile'),
      danger: true,
      onSelect: () => onReport(profile.id),
    },
    onBlock && {
      key: 'block',
      icon: MdBlock,
      label: t('blockProfile'),
      danger: true,
      onSelect: () => onBlock(profile.id),
    },
  ].filter((item) => item !== undefined);

  const renderTag = (value: string, key?: string) => (
    <Chip key={key} label={value} onClick={() => handleTagClick(value)} />
  );

  const renderLanguagePill = (
    language: LanguageCode | string,
    level: Proficiency | string | undefined,
    isPrimary: boolean,
    key?: string,
  ) => {
    const languageLabel =
      languageDisplay === 'short' && isValidLanguageCode(language)
        ? capitalizeLanguageCode(language)
        : getLanguageName(language, locale);
    const label = `${languageLabel}${
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

  const opensProfile = Boolean(onViewProfile) && !isPreview && mobile === false;
  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (
      event.currentTarget.contains(target) &&
      !target.closest('button, a, input, audio')
    ) {
      onViewProfile?.(profile.id);
    }
  };

  const cardClassName = [
    'relative flex w-full flex-col gap-4 rounded-3xl bg-background-dark p-5 transition-transform duration-200',
    opensProfile && 'group/card cursor-pointer',
    isPreview
      ? 'mb-0 border border-line shadow-none'
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
    // biome-ignore lint/a11y/useKeyWithClickEvents: the display name button opens the profile from the keyboard
    <article
      style={themeStyle}
      className={cardClassName}
      onClick={opensProfile ? handleCardClick : undefined}
    >
      <div className="-mx-5 -mt-5 relative h-[84px] flex-shrink-0">
        <div
          className="flex h-16 items-center justify-end rounded-t-3xl px-2.5"
          style={{ background: theme.banner }}
        >
          <div className="flex items-center gap-1.5">
            {lastBumpRelative && (
              <span className="whitespace-nowrap rounded-full bg-black/60 px-[11px] py-[5px] font-semibold text-[11px] text-foreground uppercase tracking-wide backdrop-blur-sm">
                {lastBumpRelative}
              </span>
            )}
            {!isPreview && mobile ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors active:bg-black/50"
                  aria-label={t('cardMenu')}
                >
                  <MdMoreVert size={19} />
                </button>
                <ActionSheet
                  open={isMenuOpen}
                  onOpenChange={setIsMenuOpen}
                  title={profile.displayName}
                  items={menuItems}
                />
              </>
            ) : null}
            {!isPreview && !mobile && (
              <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    suppressHydrationWarning
                    className="after:-inset-2 relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/30 text-foreground backdrop-blur-sm transition-colors after:absolute after:content-[''] hover:bg-black/50 hover:text-foreground focus-visible:bg-black/50"
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
                      {menuItems.map(
                        (
                          { key, icon: Icon, label, danger, onSelect },
                          index,
                        ) => (
                          <Fragment key={key}>
                            {danger && !menuItems[index - 1]?.danger ? (
                              <div className="my-1 h-[1px] bg-gray-500/50" />
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                onSelect();
                                setIsMenuOpen(false);
                              }}
                              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-background-main focus:outline-none focus-visible:bg-background-main ${danger ? 'text-danger' : 'text-foreground'}`}
                            >
                              {Icon ? (
                                <Icon
                                  size={20}
                                  className={
                                    danger
                                      ? 'text-danger'
                                      : key === 'save' && isSaved
                                        ? 'text-[var(--ct-accent,var(--color-primary))]'
                                        : 'text-muted'
                                  }
                                />
                              ) : null}
                              {label}
                            </button>
                          </Fragment>
                        ),
                      )}
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
        <h3 className="truncate font-figtree font-semibold text-foreground text-lg">
          {opensProfile ? (
            <button
              type="button"
              onClick={() => onViewProfile?.(profile.id)}
              className="max-w-full truncate text-left transition-colors focus:outline-none focus-visible:text-primary-light group-hover/card:text-primary-light"
            >
              {profile.displayName}
            </button>
          ) : (
            profile.displayName
          )}
        </h3>
        {isPreview ? (
          <span className="flex items-center gap-1.5 self-start text-muted text-xs">
            <MdContentCopy size={14} />
            <span>{t('copyUsername')}</span>
          </span>
        ) : canCopyUsername ? (
          <button
            type="button"
            onClick={handleCopyUsername}
            className="-my-2 group flex items-center gap-1.5 self-start py-2 text-left transition-colors"
            aria-label={t('copyUsername')}
          >
            <div
              className={`flex items-center justify-center transition-all duration-200 ${
                copied
                  ? 'scale-110 text-discord-blue-light'
                  : 'text-muted group-hover:text-foreground group-focus-visible:text-foreground'
              }`}
            >
              {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
            </div>
            <span
              className={`truncate text-xs transition-colors duration-200 ${
                copied
                  ? 'font-medium text-discord-blue-light'
                  : 'text-muted group-hover:text-foreground group-focus-visible:text-foreground'
              }`}
            >
              {copied ? t('copied') : t('copyUsername')}
            </span>
          </button>
        ) : (
          <span className="truncate text-subtle text-xs">
            {t('signInToViewUsername')}
          </span>
        )}
      </div>

      {copyFailed && profile.discordUsername ? (
        <p role="alert" className="text-danger text-sm">
          {t('copyFailed', { username: profile.discordUsername })}
        </p>
      ) : null}
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
                className="inline-flex items-center gap-0.5 rounded-md bg-background-darker px-[9px] py-[5px] font-medium text-[11px] text-soft transition-colors hover:bg-background-main hover:text-foreground focus-visible:text-foreground"
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
        <VoiceChip
          seconds={profile.voiceIntroSeconds}
          src={
            profile.id === 'profile-preview'
              ? undefined
              : `/api/voice/${profile.id}`
          }
        />
      ) : null}

      <div className="flex h-full flex-col gap-4 rounded-3xl bg-background-darker p-4">
        {(profile.tags.length > 0 || isPreview) && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-subtle uppercase tracking-wide">
              {t('tagsLabel')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {profile.tags.length > 0
                ? profile.tags.map((tag) =>
                    renderTag(tag, `${profile.id}-tag-${tag}`),
                  )
                : emptyTagsLabel && (
                    <span className="text-subtle text-xs">
                      {emptyTagsLabel}
                    </span>
                  )}
            </div>
          </section>
        )}

        {(profile.about || (isPreview && bioFallback)) && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-subtle uppercase tracking-wide">
              {t('descriptionLabel')}
            </span>
            <p className="whitespace-pre-wrap break-words font-light text-sm text-soft leading-normal">
              {profile.about || bioFallback}
            </p>
          </section>
        )}

        <div className="mt-auto flex flex-wrap items-start justify-between gap-3 text-muted text-xs">
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
                className="-my-2 flex items-center gap-1.5 py-2 transition-opacity hover:opacity-80 focus-visible:opacity-80 active:opacity-60"
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
