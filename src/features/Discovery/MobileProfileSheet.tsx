'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  MdCheck,
  MdClose,
  MdContentCopy,
  MdLocationOn,
  MdMoreHoriz,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import {
  ActionSheet,
  type ActionSheetItem,
  Sheet,
  SheetGroup,
  SheetLabel,
} from '@/components/Sheet';
import { countryOptions } from '@/constants/countries';
import {
  capitalizeLanguageCode,
  formatCurrentTime,
  getLanguageName,
  getProficiencyTranslationKey,
  isValidLanguageCode,
} from '@/constants/languages';
import { useLanguageDisplay } from '@/features/Settings/LanguageDisplay';
import { useTimeFormat } from '@/features/Settings/TimeFormat';
import { AvailabilityRow } from './AvailabilityRow';
import { deriveCardAccent, FREE_ACCENT, getFreeCardTheme } from './cardTheme';
import { type DiscoveryProfile, getBumpAge } from './ProfileCard';
import { type CopyUsernameHandler, useUsernameCopy } from './useUsernameCopy';
import { VoiceChip } from './VoiceChip';

export const MobileNameCopy = ({
  name,
  copied,
  onCopy,
  big = false,
}: {
  name: string;
  copied: boolean;
  onCopy: () => void;
  big?: boolean;
}) => {
  const t = useTranslations('Discovery');

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={t('copyNamedUsername', { name })}
      className="-my-1.5 flex max-w-full items-center gap-2 self-start py-1.5 text-left"
    >
      <span
        className={`truncate font-figtree transition-colors duration-200 ${
          big ? 'font-bold text-2xl' : 'font-semibold text-[19px]'
        } ${copied ? 'text-discord-blue-light' : 'text-foreground active:text-primary-light'}`}
      >
        {name}
      </span>
      <span
        className={`flex h-6 flex-shrink-0 items-center gap-1 rounded-full px-1.5 transition-colors duration-200 ${
          copied
            ? 'bg-[rgba(89,100,242,0.18)] text-discord-blue-light'
            : 'text-muted'
        }`}
      >
        {copied ? <MdCheck size={15} /> : <MdContentCopy size={15} />}
        <span
          className={`overflow-hidden whitespace-nowrap font-bold text-xs transition-[max-width,opacity] duration-300 ${
            copied ? 'max-w-[72px] opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          {t('copied')}
        </span>
      </span>
    </button>
  );
};

type MobileProfileSheetProps = {
  profile: DiscoveryProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn?: boolean;
  viewerTimezone?: string;
  onCopyUsername?: CopyUsernameHandler;
  menuItems?: ActionSheetItem[];
};

export const MobileProfileSheet = ({
  profile,
  open,
  onOpenChange,
  isLoggedIn = false,
  viewerTimezone,
  onCopyUsername,
  menuItems = [],
}: MobileProfileSheetProps) => {
  const t = useTranslations('Discovery');
  const tPublic = useTranslations('PublicProfile');
  const tProfile = useTranslations('Profile');
  const tSheet = useTranslations('Sheet');
  const locale = useLocale();
  const timeFormat = useTimeFormat();
  const languageDisplay = useLanguageDisplay();
  const { copy, copied, copyFailed } = useUsernameCopy(profile, onCopyUsername);
  const [menuOpen, setMenuOpen] = useState(false);
  const canCopy = profile.allowAnonymousCopy !== false || isLoggedIn;
  const theme = profile.cardTheme ?? getFreeCardTheme(2);
  const bumpAge = getBumpAge(profile.lastBumpedAt);
  const bumped =
    profile.lastBumpRelative ??
    (bumpAge ? t(bumpAge.key, { count: bumpAge.count ?? 0 }) : undefined);
  const currentTime = profile.timezone
    ? formatCurrentTime(profile.timezone, timeFormat, locale)
    : '';
  const countryName =
    countryOptions(locale).find(({ value }) => value === profile.country)
      ?.label ?? profile.country;
  const languageName = (language: string) =>
    languageDisplay === 'short' && isValidLanguageCode(language)
      ? capitalizeLanguageCode(language)
      : getLanguageName(language, locale);
  const bannerButton =
    'flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors active:bg-black/50';

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={profile.displayName}
      full
      flush
      bare
    >
      <div
        className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none]"
        style={deriveCardAccent(profile.premium ? theme.accent : FREE_ACCENT)}
      >
        <div
          className="relative flex h-24 justify-end gap-2 px-2 pt-1.5"
          style={{ background: theme.banner }}
        >
          {menuItems.length ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={tPublic('moreActions')}
              className={bannerButton}
            >
              <MdMoreHoriz size={20} />
            </button>
          ) : null}
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={tSheet('close')}
              className={bannerButton}
            >
              <MdClose size={20} />
            </button>
          </Dialog.Close>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-6">
          <div className="-mt-[52px] relative z-[1] flex items-end justify-between">
            <div className="rounded-full bg-background-dark p-1.5">
              <Avatar avatarUrl={profile.avatarUrl} size="lg" />
            </div>
            {bumped ? (
              <span className="mb-2 whitespace-nowrap rounded-full bg-background-main px-[11px] py-[5px] font-semibold text-[11px] text-foreground uppercase tracking-wide">
                {tPublic('bumped', { time: bumped })}
              </span>
            ) : null}
          </div>
          <div>
            {canCopy ? (
              <MobileNameCopy
                name={profile.displayName}
                copied={copied}
                onCopy={() => void copy()}
                big
              />
            ) : (
              <p className="truncate font-bold font-figtree text-2xl">
                {profile.displayName}
              </p>
            )}
            <p className="mt-0.5 text-muted text-xs">
              {canCopy ? t('tapToCopyHint') : t('signInToViewUsername')}
            </p>
            {copyFailed && profile.discordUsername ? (
              <p role="alert" className="mt-1.5 text-danger text-sm">
                {t('copyFailed', { username: profile.discordUsername })}
              </p>
            ) : null}
            {profile.country || currentTime ? (
              <p className="mt-2 flex items-center gap-1.5 text-muted text-xs">
                <MdLocationOn
                  size={16}
                  className="flex-shrink-0 text-[var(--ct-accent,var(--color-primary))]"
                />
                {[
                  countryName,
                  currentTime && t('currentlyTime', { time: currentTime }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
          {profile.premium && profile.voiceIntroSeconds ? (
            <VoiceChip
              seconds={profile.voiceIntroSeconds}
              src={`/api/voice/${profile.id}`}
              className="self-start"
            />
          ) : null}
          <div>
            <SheetLabel>{t('languagesLabel')}</SheetLabel>
            <SheetGroup>
              {[
                {
                  language: profile.primaryLanguage,
                  value: t('detailPrimary'),
                },
                ...profile.targetLanguages.map(({ language, level }) => ({
                  language,
                  value: level
                    ? tProfile(getProficiencyTranslationKey(level))
                    : '',
                })),
              ].map(({ language, value }) => (
                <div
                  key={language}
                  className="relative flex min-h-14 items-center gap-3.5 px-4 py-2.5 text-[15px] before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-line first:before:hidden"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {languageName(language)}
                  </span>
                  <span className="text-muted text-sm">{value}</span>
                </div>
              ))}
            </SheetGroup>
          </div>
          {profile.availability ? (
            <div>
              <SheetLabel>{tProfile('freeTimeLabel')}</SheetLabel>
              <AvailabilityRow
                availability={profile.availability}
                ownerTimezone={profile.timezone}
                viewerTimezone={viewerTimezone}
                expanded
              />
            </div>
          ) : null}
          {profile.tags.length ? (
            <div>
              <SheetLabel>{t('tagsLabel')}</SheetLabel>
              <div className="flex flex-wrap gap-2">
                {profile.tags.map((tag) => (
                  <Chip key={tag} label={tag} className="!rounded-full" />
                ))}
              </div>
            </div>
          ) : null}
          {profile.about ? (
            <div>
              <SheetLabel>{t('descriptionLabel')}</SheetLabel>
              <p className="whitespace-pre-wrap break-words font-light text-[15px] text-soft leading-normal">
                {profile.about}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <ActionSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={profile.displayName}
        items={menuItems}
      />
    </Sheet>
  );
};
