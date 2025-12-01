'use client';

import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
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
import {
  capitalizeLanguageCode,
  formatCurrentTime,
  getProficiencyTranslationKey,
  type IANATimezone,
  type LanguageCode,
  type Proficiency,
  type TimeFormat,
} from '@/constants/languages';

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

const tagPillClasses =
  'inline-flex items-center gap-1.5 rounded-md bg-primary-darker px-2 py-0.5';
const baseLanguagePillClasses =
  'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap flex-shrink-0';
const languagePillClasses = `${baseLanguagePillClasses} bg-background-darker text-gray-200`;
const primaryLanguagePillClasses = `${baseLanguagePillClasses} bg-primary-darker text-white`;

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() =>
    getTimeFormat(),
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const canCopyUsername = profile.allowAnonymousCopy !== false || isLoggedIn;

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

  const maxTargetLanguagesToShow = 2;
  const displayedTargetLanguages = profile.targetLanguages.slice(
    0,
    maxTargetLanguagesToShow,
  );
  const remainingTargetLanguages = profile.targetLanguages.slice(
    maxTargetLanguagesToShow,
  );
  const remainingLanguagesCount = remainingTargetLanguages.length;

  const displayedLanguages: Array<{
    language: LanguageCode | string;
    level?: Proficiency | string;
    isPrimary: boolean;
  }> = [
    {
      language: profile.primaryLanguage,
      level: profile.primaryLanguageLevel,
      isPrimary: true,
    },
    ...displayedTargetLanguages.map((lang) => ({
      language: lang.language,
      level: lang.level,
      isPrimary: false,
    })),
  ];

  const remainingLanguages: Array<{
    language: LanguageCode | string;
    level?: Proficiency | string;
    isPrimary: boolean;
  }> = remainingTargetLanguages.map((lang) => ({
    language: lang.language,
    level: lang.level,
    isPrimary: false,
  }));

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
    <button
      key={key}
      type="button"
      onClick={() => handleTagClick(value)}
      className={`${tagPillClasses} cursor-pointer transition-opacity hover:opacity-80 active:opacity-60`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary-dark" />
      <span className="font-medium text-primary-light text-xs">{value}</span>
    </button>
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
      {capitalizeLanguageCode(language)}
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
      className={`flex h-full w-full max-w-sm flex-col gap-4 rounded-2xl bg-background-dark p-4 shadow-lg transition-transform duration-200 ${
        isPopoverOpen || isMenuOpen
          ? '-translate-y-1 shadow-xl'
          : 'hover:-translate-y-1 hover:shadow-xl'
      }`}
    >
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-background-darker p-1.5">
              <Avatar avatarUrl={profile.avatarUrl} size="md" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="truncate font-figtree font-semibold text-lg text-white">
                {profile.displayName}
              </h3>
              {canCopyUsername ? (
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="group flex items-center gap-1.5 text-left transition-colors"
                  aria-label={t('copyUsername')}
                >
                  <div
                    className={`flex items-center justify-center transition-all duration-200 ${
                      copied
                        ? 'scale-110 text-discord-blue-light'
                        : 'text-gray-400 group-hover:text-white'
                    }`}
                  >
                    {copied ? (
                      <MdCheck size={14} />
                    ) : (
                      <MdContentCopy size={14} />
                    )}
                  </div>
                  <span
                    className={`truncate text-xs transition-colors duration-200 ${
                      copied
                        ? 'font-medium text-discord-blue-light'
                        : 'text-gray-400 group-hover:text-white'
                    }`}
                  >
                    {t('copyUsername')}
                  </span>
                </button>
              ) : (
                <span className="truncate text-gray-500 text-xs">
                  {t('signInToViewUsername')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile.lastBumpRelative && (
              <span className="whitespace-nowrap rounded-full bg-background-darker px-3 py-1.5 font-semibold text-[11px] text-gray-300 uppercase tracking-wide">
                {profile.lastBumpRelative}
              </span>
            )}
            <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-background-main/50 hover:text-white"
                  aria-label={t('cardMenu')}
                >
                  <MdMoreVert size={20} />
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

        <div className="flex flex-wrap items-center gap-2">
          {displayedLanguages.map(({ language, level, isPrimary }) =>
            renderLanguagePill(
              language,
              level,
              isPrimary,
              `${profile.id}-${language}-${isPrimary ? 'primary' : 'target'}`,
            ),
          )}
          {remainingLanguagesCount > 0 && (
            <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-background-darker px-2.5 py-1 font-medium text-[11px] text-gray-300 transition-colors hover:bg-background-main/50 hover:text-white"
                  aria-label={`Show ${remainingLanguagesCount} more languages`}
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
                    {remainingLanguages.map(
                      ({ language, level, isPrimary }, index) =>
                        renderLanguagePill(
                          language,
                          level,
                          isPrimary,
                          `${profile.id}-remaining-${language}-${index}`,
                        ),
                    )}
                  </div>
                  <Popover.Arrow className="fill-gray-500/50" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          )}
        </div>
      </header>

      <div className="flex h-full flex-col gap-4 rounded-2xl bg-background-darker p-4">
        {profile.interests.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-wide">
              {t('tagsLabel')}
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.interests
                .slice(0, 4)
                .map((interest) =>
                  renderTag(interest, `${profile.id}-tag-${interest}`),
                )}
              {profile.interests.length > 4 && (
                <span className="rounded-md bg-background-main/50 px-2 py-1 text-[11px] text-gray-400">
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
            <p className="line-clamp-4 text-gray-300 text-sm leading-snug">
              {profile.about}
            </p>
          </section>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3 text-gray-400 text-xs">
          <div className="flex flex-col gap-1">
            {profile.country && (
              <button
                type="button"
                onClick={handleCountryClick}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
              >
                <MdLocationOn className="text-primary" size={16} />
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
