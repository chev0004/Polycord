'use client';

import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { type CSSProperties, Fragment, useEffect, useState } from 'react';
import {
  MdBlock,
  MdBookmark,
  MdBookmarkBorder,
  MdCheck,
  MdContentCopy,
  MdEdit,
  MdFlag,
  MdLink,
  MdMoreHoriz,
  MdWorkspacePremium,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { ActionSheet, type ActionSheetItem } from '@/components/Sheet';
import {
  type AvailabilityPattern,
  formatAvailability,
  tzAbbr,
  tzOffsetMinutes,
} from '@/constants/availability';
import { countryOptions } from '@/constants/countries';
import {
  capitalizeLanguageCode,
  formatCurrentTime,
  getAllProficiencyValues,
  getLanguageName,
  getProficiencyTranslationKey,
  isValidLanguageCode,
  type Proficiency,
} from '@/constants/languages';
import {
  deriveCardAccent,
  FREE_ACCENT,
  getFreeCardTheme,
} from '@/features/Discovery/cardTheme';
import {
  type DiscoveryProfile,
  getBumpAge,
} from '@/features/Discovery/ProfileCard';
import { VoiceChip } from '@/features/Discovery/VoiceChip';
import { useLanguageDisplay } from '@/features/Settings/LanguageDisplay';
import { useTimeFormat } from '@/features/Settings/TimeFormat';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { buildDualDay, type TimelineRun } from './memberTimeline';

type ProfileDetailProps = {
  profile: DiscoveryProfile;
  isLoggedIn?: boolean;
  isSaved?: boolean;
  isSaving?: boolean;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
  onCopyUsername: () => Promise<boolean>;
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

const tintedSurface =
  'linear-gradient(var(--card-tint,transparent),var(--card-tint,transparent)),var(--color-background-dark)';
const bannerFill = '[background:var(--member-banner)]';
const overlapFill = 'bg-overlay ring-1 ring-line-strong ring-inset';

const runStyle = ({ left, width }: TimelineRun) => ({
  left: `${left}%`,
  width: `${width}%`,
});

const Lane = ({
  runs,
  className,
  fill,
}: {
  runs: TimelineRun[];
  className: string;
  fill: string;
}) => (
  <span
    className={`absolute inset-x-0 h-2 rounded-full bg-overlay ${className}`}
  >
    {runs.map((run) => (
      <span
        key={run.left}
        className={`absolute inset-y-0 rounded-full ${fill}`}
        style={runStyle(run)}
      />
    ))}
  </span>
);

const LegendRow = ({
  swatch,
  name,
  range,
  now,
}: {
  swatch: string;
  name: string;
  range: string;
  now: string;
}) => (
  <div className="grid grid-cols-[14px_52px_minmax(0,1fr)] items-start gap-2">
    <span className={`mt-1.5 h-1.5 rounded-full ${swatch}`} />
    <span className="truncate font-semibold text-foreground">{name}</span>
    <span className="flex flex-wrap gap-x-1.5 gap-y-0.5">
      <span>{range}</span>
      <span className="whitespace-nowrap text-subtle">{now}</span>
    </span>
  </div>
);

const TheirTime = ({
  profile,
  timezone,
  viewerTimezone,
  viewerAvailability,
  firstName,
}: {
  profile: DiscoveryProfile;
  timezone: string;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
  firstName: string;
}) => {
  const t = useTranslations('PublicProfile');
  const tDiscovery = useTranslations('Discovery');
  const locale = useLocale();
  const timeFormat = useTimeFormat();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return <span className="h-8" />;

  const viewerZone =
    viewerTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const theirOffset = tzOffsetMinutes(timezone);
  const offset = (theirOffset - tzOffsetMinutes(viewerZone)) / 60;
  const theirMinutes =
    now.getUTCHours() * 60 + now.getUTCMinutes() + theirOffset;
  const day = buildDualDay({
    theirs: profile.availability,
    yours: viewerAvailability,
    offset,
    theirHour: (((theirMinutes % 1440) + 1440) % 1440) / 60,
  });
  const labels = {
    days: {
      any: tDiscovery('availabilityDayAny'),
      weekdays: tDiscovery('availabilityDayWeekdays'),
      weekends: tDiscovery('availabilityDayWeekends'),
    },
    anyTime: tDiscovery('availabilityAnyTime'),
    to: tDiscovery('availabilityTimeSeparator'),
    viewerSuffix: tDiscovery('availabilityViewerSuffix'),
  };
  const range = (pattern: AvailabilityPattern | undefined, zone: string) =>
    formatAvailability(pattern, zone, undefined, labels, timeFormat, locale)
      ?.ownerStr ?? t('notSet');
  const hours = Math.floor(day.overlapMinutes / 60);
  const minutes = day.overlapMinutes % 60;
  const duration =
    hours && minutes
      ? t('durationHoursMinutes', { hours, minutes })
      : hours
        ? t('durationHours', { hours })
        : t('durationMinutes', { minutes });

  return (
    <>
      <span className="font-bold text-[32px] text-foreground tabular-nums leading-none tracking-[-0.02em]">
        {formatCurrentTime(timezone, timeFormat, locale)}
      </span>
      <span className="text-[13px] text-muted leading-normal">
        {offset === 0
          ? t('sameTime')
          : t(offset > 0 ? 'hoursAhead' : 'hoursBehind', {
              hours: Math.abs(offset),
            })}
      </span>
      <div
        aria-hidden
        className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1 text-[11px] text-subtle tabular-nums"
      >
        <span className="col-start-2 row-start-1 flex justify-between">
          {day.ticks.map((tick) => (
            <span key={tick.hour}>{tick.top}</span>
          ))}
        </span>
        <span className="col-start-1 row-start-2 whitespace-nowrap font-semibold">
          {tzAbbr(timezone)}
        </span>
        <span className="relative col-start-2 row-span-2 row-start-2 h-[30px]">
          {day.overlap.map((run) => (
            <span
              key={run.left}
              className={`-inset-y-[3px] absolute rounded-md ${overlapFill}`}
              style={runStyle(run)}
            />
          ))}
          <Lane runs={day.theirs} className="top-[3px]" fill={bannerFill} />
          <Lane
            runs={day.yours}
            className="bottom-[3px]"
            fill="bg-foreground"
          />
          <span
            className="-inset-y-0.5 -ml-px absolute z-[2] w-0.5 rounded-sm bg-foreground"
            style={{ left: `${day.now}%` }}
          />
        </span>
        <span className="col-start-1 row-start-3 whitespace-nowrap font-semibold">
          {tzAbbr(viewerZone)}
        </span>
        <span className="col-start-2 row-start-4 flex justify-between">
          {day.ticks.map((tick) => (
            <span key={tick.hour}>{tick.bottom}</span>
          ))}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-[5px] text-[13px] text-muted tabular-nums">
        <LegendRow
          swatch={bannerFill}
          name={firstName}
          range={range(profile.availability, timezone)}
          now={t('nowTime', {
            time: formatCurrentTime(timezone, timeFormat, locale),
          })}
        />
        <LegendRow
          swatch="bg-foreground"
          name={t('you')}
          range={range(viewerAvailability, viewerZone)}
          now={t('nowTime', {
            time: formatCurrentTime(viewerZone, timeFormat, locale),
          })}
        />
        {day.overlapMinutes > 0 ? (
          <div className="mt-0.5 grid grid-cols-[14px_minmax(0,1fr)] items-center gap-2 text-subtle text-xs">
            <span className={`h-2.5 rounded-[3px] ${overlapFill}`} />
            <span>{t('overlap', { duration })}</span>
          </div>
        ) : null}
      </div>
    </>
  );
};

export const ProfileDetail = ({
  profile,
  isLoggedIn,
  isSaved,
  isSaving,
  viewerTimezone,
  viewerAvailability,
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
  const mobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = profile.cardTheme ?? getFreeCardTheme(2);
  const tinted = Boolean(profile.premium && theme.tint);
  const canCopy = isLoggedIn || profile.allowAnonymousCopy !== false;
  const firstName = profile.displayName.split(' ')[0];
  const bumpAge = getBumpAge(profile.lastBumpedAt);
  const countryName =
    countryOptions(locale).find(({ value }) => value === profile.country)
      ?.label ?? profile.country;
  const languageName = (language: string) =>
    languageDisplay === 'short' && isValidLanguageCode(language)
      ? capitalizeLanguageCode(language)
      : getLanguageName(language, locale);
  const levelLabel = (level: Proficiency | string) =>
    tProfile(getProficiencyTranslationKey(level));
  const nameEffect =
    'group-hover:bg-clip-text group-hover:text-transparent group-hover:[background:var(--member-banner)]';
  const iconEffect =
    'group-hover:translate-x-0 group-hover:text-[#0b0b0c] group-hover:opacity-100 group-hover:[background:var(--member-banner)]';

  const copy = async () => {
    if (!canCopy) return onSignIn();
    const copiedToClipboard = await onCopyUsername();
    setCopyFailed(!copiedToClipboard);
    if (!copiedToClipboard) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems: ActionSheetItem[] = [
    onToggleSave && {
      key: 'save',
      icon: isSaved ? MdBookmark : MdBookmarkBorder,
      label: isSaved ? tDiscovery('unsaveProfile') : tDiscovery('saveProfile'),
      disabled: isSaving,
      onSelect: onToggleSave,
    },
    onEdit && {
      key: 'edit',
      icon: MdEdit,
      label: tProfile('editProfile'),
      onSelect: onEdit,
    },
    onReport && {
      key: 'report',
      icon: MdFlag,
      label: tDiscovery('reportProfile'),
      danger: true,
      onSelect: onReport,
    },
    onBlock && {
      key: 'block',
      icon: MdBlock,
      label: tDiscovery('blockProfile'),
      danger: true,
      onSelect: onBlock,
    },
  ].filter((item) => item !== undefined);

  const menuTrigger = (
    <button
      type="button"
      onClick={mobile ? () => setMenuOpen(true) : undefined}
      aria-label={t('moreActions')}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-background-main hover:text-foreground focus:outline-none focus-visible:bg-background-main focus-visible:text-foreground"
    >
      <MdMoreHoriz size={20} />
    </button>
  );

  return (
    <article
      className="overflow-hidden rounded-3xl bg-background-dark shadow-xl"
      style={
        {
          ...deriveCardAccent(profile.premium ? theme.accent : FREE_ACCENT),
          '--member-banner': theme.banner,
          ...(tinted
            ? { '--card-tint': theme.tint, background: tintedSurface }
            : {}),
        } as CSSProperties
      }
    >
      <div
        className="h-[132px] min-[861px]:h-[176px]"
        style={{ background: theme.banner }}
      />
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-5 gap-y-3.5 px-5 pb-2 min-[861px]:px-7">
        <div
          className="-mt-[62px] relative z-[1] justify-self-start rounded-full bg-background-dark p-2"
          style={tinted ? { background: tintedSurface } : undefined}
        >
          <Avatar avatarUrl={profile.avatarUrl} size="xl" />
        </div>
        <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 pb-1">
          {bumpAge ? (
            <span className="mr-1 whitespace-nowrap rounded-full bg-background-darker px-[11px] py-[5px] font-semibold text-[11px] text-foreground uppercase tracking-wide">
              {t('bumped', {
                time: tDiscovery(bumpAge.key, { count: bumpAge.count ?? 0 }),
              })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onShare}
            aria-label={t('copyProfileLink')}
            title={t('copyProfileLink')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-background-main hover:text-foreground focus:outline-none focus-visible:bg-background-main focus-visible:text-foreground"
          >
            <MdLink size={20} />
          </button>
          {menuItems.length > 0 && mobile ? (
            <>
              {menuTrigger}
              <ActionSheet
                open={menuOpen}
                onOpenChange={setMenuOpen}
                title={profile.displayName}
                items={menuItems}
              />
            </>
          ) : null}
          {menuItems.length > 0 && !mobile ? (
            <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Popover.Trigger asChild>{menuTrigger}</Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-[200px] rounded-lg border border-gray-500/50 bg-background-dark p-1 shadow-lg"
                  side="bottom"
                  align="end"
                  sideOffset={6}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  {menuItems.map(
                    (
                      { key, icon: Icon, label, danger, disabled, onSelect },
                      index,
                    ) => (
                      <Fragment key={key}>
                        {danger && index > 0 && !menuItems[index - 1].danger ? (
                          <div className="my-1 h-px bg-gray-500/50" />
                        ) : null}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            onSelect();
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-background-main focus:outline-none focus-visible:bg-background-main disabled:opacity-60 ${danger ? 'text-danger' : 'text-foreground'}`}
                        >
                          {Icon ? (
                            <Icon
                              size={19}
                              className={danger ? 'text-danger' : 'text-muted'}
                            />
                          ) : null}
                          {label}
                        </button>
                      </Fragment>
                    ),
                  )}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          ) : null}
        </div>
        <div className="col-start-1 flex min-w-0 flex-col gap-1.5">
          <h1 className="min-w-0">
            <button
              type="button"
              onClick={copy}
              title={
                canCopy
                  ? tDiscovery('copyUsername')
                  : tDiscovery('signInToViewUsername')
              }
              className="group flex max-w-full items-center gap-2.5 text-left focus:outline-none"
            >
              <span
                className={`truncate font-bold font-figtree text-[32px] text-foreground leading-[1.1] tracking-[-0.01em] transition-colors ${
                  copied
                    ? 'bg-clip-text text-transparent [background:var(--member-banner)]'
                    : nameEffect
                }`}
              >
                {profile.displayName}
              </span>
              <span
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                  copied
                    ? 'text-[#0b0b0c] [background:var(--member-banner)]'
                    : `-translate-x-1 text-muted opacity-0 ${iconEffect}`
                }`}
              >
                {copied ? <MdCheck size={17} /> : <MdContentCopy size={17} />}
              </span>
            </button>
          </h1>
          {copyFailed && profile.discordUsername ? (
            <p role="alert" className="text-danger text-sm">
              {tDiscovery('copyFailed', { username: profile.discordUsername })}
            </p>
          ) : null}
          {profile.premium ? (
            <div className="flex items-center gap-3 text-muted text-sm">
              {profile.voiceIntroSeconds ? (
                <VoiceChip
                  seconds={profile.voiceIntroSeconds}
                  src={`/api/voice/${profile.id}`}
                />
              ) : null}
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary-darker pr-2.5 pl-[7px] font-semibold text-primary-light text-xs">
                <MdWorkspacePremium size={15} />
                {t('premium')}
              </span>
            </div>
          ) : null}
        </div>
        {profile.tags.length ? (
          <div className="col-span-2 flex flex-wrap gap-2 min-[861px]:col-span-1 min-[861px]:col-start-2 min-[861px]:justify-end min-[861px]:self-center">
            {profile.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => onTagClick(tag)}
                className="!rounded-full !px-3 !py-[5px] max-w-full break-words [&_span]:text-[13px]"
              />
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-1 grid items-start gap-9 px-5 pt-6 pb-7 min-[861px]:grid-cols-[minmax(0,1fr)_340px] min-[861px]:gap-[72px] min-[861px]:px-7 min-[861px]:pt-7 min-[861px]:pb-9">
        <section className="flex min-w-0 flex-col">
          <p className="mb-2.5 font-semibold text-[13px] text-[var(--ct-chip-dot,var(--color-primary))]">
            {t('fromName', { name: firstName })}
          </p>
          <p className="whitespace-pre-wrap break-words text-[17px] text-soft leading-[1.65]">
            {profile.about}
          </p>
        </section>
        <dl className="flex min-w-0 flex-col [&>div:first-child]:border-t-0 [&>div:first-child]:pt-1 [&>div]:grid [&>div]:grid-cols-[96px_minmax(0,1fr)] [&>div]:gap-4 [&>div]:border-line [&>div]:border-t [&>div]:py-4 [&_dt]:pt-0.5 [&_dt]:text-[13px] [&_dt]:text-subtle">
          <div>
            <dt>{t('speaks')}</dt>
            <dd className="flex flex-wrap items-baseline gap-2">
              <button
                type="button"
                onClick={() => onLanguageClick(profile.primaryLanguage, true)}
                className="font-semibold text-[15px] text-foreground hover:underline focus:outline-none focus-visible:underline"
              >
                {languageName(profile.primaryLanguage)}
              </button>
              <span className="text-[13px] text-muted">
                {profile.primaryLanguageLevel
                  ? levelLabel(profile.primaryLanguageLevel)
                  : t('native')}
              </span>
            </dd>
          </div>
          {profile.targetLanguages.length ? (
            <div>
              <dt>{t('learning')}</dt>
              <dd className="flex flex-col gap-2.5">
                {profile.targetLanguages.map(({ language, level }) => {
                  const step =
                    getAllProficiencyValues().indexOf(level as Proficiency) + 1;
                  return (
                    <span
                      key={language}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => onLanguageClick(language, false)}
                        className="truncate text-left font-semibold text-[15px] text-foreground hover:underline focus:outline-none focus-visible:underline"
                      >
                        {languageName(language)}
                      </button>
                      <span className="text-[13px] text-muted">
                        {level ? levelLabel(level) : null}
                      </span>
                      <span aria-hidden className="flex gap-0.5">
                        {[1, 2, 3, 4].map((dot) => (
                          <span
                            key={dot}
                            className={`h-1 w-2.5 rounded-full ${
                              dot <= step
                                ? 'bg-[var(--ct-chip-dot,var(--color-primary))]'
                                : 'bg-overlay'
                            }`}
                          />
                        ))}
                      </span>
                    </span>
                  );
                })}
              </dd>
            </div>
          ) : null}
          {profile.country ? (
            <div>
              <dt>{t('from')}</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => onCountryClick(profile.country as string)}
                  className="break-words text-left font-semibold text-[15px] text-foreground hover:underline focus:outline-none focus-visible:underline"
                >
                  {countryName}
                </button>
              </dd>
            </div>
          ) : null}
          {profile.timezone ? (
            <div>
              <dt>{t('theirTime')}</dt>
              <dd className="flex min-w-0 flex-col gap-1.5">
                <TheirTime
                  profile={profile}
                  timezone={profile.timezone}
                  viewerTimezone={viewerTimezone}
                  viewerAvailability={viewerAvailability}
                  firstName={firstName}
                />
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  );
};
