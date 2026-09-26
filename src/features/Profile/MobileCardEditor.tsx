'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Controller,
  type FieldErrors,
  type UseFormReturn,
} from 'react-hook-form';
import type { IconType } from 'react-icons';
import { FaDiscord } from 'react-icons/fa';
import {
  MdAdd,
  MdArrowBack,
  MdChevronRight,
  MdDeleteOutline,
  MdMoreVert,
  MdPalette,
  MdPublic,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FieldError, TextInput, Toggle } from '@/components/Form';
import {
  ActionSheet,
  type ActionSheetItem,
  Sheet,
  SheetDrill,
  SheetGroup,
  SheetIconButton,
  SheetLabel,
  SheetPickList,
  SheetRow,
  SheetTextButton,
} from '@/components/Sheet';
import {
  countryOptions,
  getLanguageName,
  getProficiencyTranslationKey,
  languageOptions,
  proficiencyOptions,
} from '@/constants';
import {
  formatCurrentTime,
  getAllProficiencyValues,
  type Proficiency,
} from '@/constants/languages';
import { type DiscoveryProfile, ProfileCard } from '@/features/Discovery';
import { AvailabilityRow } from '@/features/Discovery/AvailabilityRow';
import {
  type CardTheme,
  CUSTOM_CARD_THEME_ID,
  deriveCardAccent,
  FREE_ACCENT,
} from '@/features/Discovery/cardTheme';
import { MobileProfileSheet } from '@/features/Discovery/MobileProfileSheet';
import { SettingsToggleRow } from '@/features/Settings/MobileSettings';
import { useTimeFormat } from '@/features/Settings/TimeFormat';
import { entitlementLimit } from '@/lib/entitlements';
import { BIO_MAX } from '@/lib/profileFields';
import { COLOR_LABEL_KEYS } from './CardColorPicker';
import {
  FREE_LANGUAGE_CAP,
  PREMIUM_LANGUAGE_CAP,
  type ProfileFormValues,
} from './schema';
import { createEmptyLanguageRow } from './TargetLanguagesEditor';

type EditorSheet =
  | 'style'
  | 'name'
  | 'languages'
  | 'voice'
  | 'availability'
  | 'tags'
  | 'location'
  | 'privacy'
  | 'menu';

type LanguagePick = { kind: 'primary' } | { kind: 'target'; index: number };

type MobileCardEditorProps = {
  form: UseFormReturn<ProfileFormValues>;
  onSubmit: (data: ProfileFormValues) => Promise<void>;
  onDiscard: () => void;
  onStyleClose: () => void;
  premium: boolean;
  premiumLook: boolean;
  theme: CardTheme;
  displayName: string;
  userAvatarUrl?: string;
  previewProfile: DiscoveryProfile;
  statusMessage: ReactNode;
  draftNotice: ReactNode;
  menuItems: ActionSheetItem[];
  cardStylePicker: ReactNode;
  voiceEditor: ReactNode;
  availabilityEditor: ReactNode;
  tagEditor: ReactNode;
  submitLabel: string;
  submittingLabel: string;
};

const flashClass = 'animate-[rowFlash_0.9s_cubic-bezier(0.16,1,0.3,1)]';
const rowDivider =
  'relative before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-line first:before:hidden';

const EditGroup = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: ReactNode;
}) => (
  <section className="mt-[22px] flex flex-col gap-2">
    <h2 className="flex items-baseline justify-between px-1 font-semibold text-subtle text-xs uppercase tracking-[0.06em]">
      {title}
      {count ? (
        <span className="font-medium normal-case tracking-normal">{count}</span>
      ) : null}
    </h2>
    <div className="overflow-hidden rounded-3xl bg-background-dark">
      {children}
    </div>
  </section>
);

const ListRow = ({
  label,
  value,
  meta,
  stacked = false,
  add = false,
  flash = false,
  onClick,
  children,
}: {
  label: string;
  value?: ReactNode;
  meta?: ReactNode;
  stacked?: boolean;
  add?: boolean;
  flash?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[52px] w-full items-center gap-2.5 py-3 pr-3 pl-4 text-left transition-colors duration-150 active:bg-overlay ${rowDivider} ${flash ? flashClass : ''}`}
  >
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`truncate ${
            stacked
              ? 'text-[13px] text-subtle'
              : add
                ? 'font-medium text-[15px] text-[var(--ct-accent,var(--color-primary))]'
                : 'font-medium text-[15px]'
          }`}
        >
          {label}
        </span>
        {meta}
      </span>
      {children}
    </span>
    {value ? (
      <span className="flex min-w-0 max-w-[55%] items-center truncate text-[15px] text-muted">
        {value}
      </span>
    ) : null}
    {add ? (
      <MdAdd
        size={20}
        aria-hidden
        className="flex-shrink-0 text-[var(--ct-accent,var(--color-primary))]"
      />
    ) : (
      <MdChevronRight
        size={20}
        aria-hidden
        className="flex-shrink-0 text-subtle"
      />
    )}
  </button>
);

const SwitchRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) => (
  <div
    className={`flex min-h-[52px] items-center gap-2.5 px-4 py-3 ${rowDivider}`}
  >
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="font-medium text-[15px]">{label}</span>
      <span className="text-[13px] text-subtle leading-snug">
        {description}
      </span>
    </span>
    {children}
  </div>
);

const LevelMeter = ({ level }: { level: string }) => {
  const t = useTranslations('Profile');
  const step = getAllProficiencyValues().indexOf(level as Proficiency) + 1;

  return (
    <span className="flex min-w-0 items-center gap-[3px]">
      {getAllProficiencyValues().map((value, index) => (
        <span
          key={value}
          aria-hidden
          className={`h-1 w-3 flex-shrink-0 rounded-sm ${
            index < step
              ? 'bg-[var(--ct-accent,var(--color-primary))]'
              : 'bg-overlay'
          }`}
        />
      ))}
      <span className="ml-1.5 truncate text-[13px] text-muted">
        {t(getProficiencyTranslationKey(level))}
      </span>
    </span>
  );
};
const Ghost = ({
  icon: Icon,
  label,
  tag,
  onClick,
}: {
  icon?: IconType;
  label: string;
  tag?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-primary-dark border-dashed px-3 text-left font-semibold text-[13px] text-muted active:bg-overlay"
  >
    {Icon ? (
      <Icon size={18} aria-hidden className="flex-shrink-0 text-primary" />
    ) : null}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {tag ? (
      <span className="rounded bg-primary-darker px-1.5 py-0.5 font-bold text-[10px] text-primary-light uppercase tracking-[0.04em]">
        {tag}
      </span>
    ) : null}
  </button>
);

const footerButton = (label: string, onClick: () => void) => (
  <Button
    weight="semibold"
    onClick={onClick}
    className="h-[50px] flex-1 rounded-full text-[15px]"
  >
    {label}
  </Button>
);

export const MobileCardEditor = ({
  form,
  onSubmit,
  onDiscard,
  onStyleClose,
  premium,
  premiumLook,
  theme,
  displayName,
  userAvatarUrl,
  previewProfile,
  statusMessage,
  draftNotice,
  menuItems,
  cardStylePicker,
  voiceEditor,
  availabilityEditor,
  tagEditor,
  submitLabel,
  submittingLabel,
}: MobileCardEditorProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const {
    control,
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [sheet, setSheet] = useState<EditorSheet | null>(null);
  const [languagePick, setLanguagePick] = useState<LanguagePick | null>(null);
  const [countryPicking, setCountryPicking] = useState(false);
  const [publicOpen, setPublicOpen] = useState(false);
  const [flash, setFlash] = useState<EditorSheet | null>(null);
  const bioRef = useRef<HTMLTextAreaElement | null>(null);
  const bioField = register('bio');
  const timeFormat = useTimeFormat();

  const values = watch();
  const targetLanguages = values.targetLanguages ?? [];
  const tags = values.tags ?? [];
  const voiceSeconds = values.voiceIntroSeconds ?? 0;
  const languageCap = premium ? PREMIUM_LANGUAGE_CAP : FREE_LANGUAGE_CAP;
  const tagCap = entitlementLimit('profile.tags', premium);
  const allLanguages = useMemo(() => languageOptions(locale), [locale]);
  const levels = useMemo(() => proficiencyOptions(locale), [locale]);
  const countries = useMemo(() => countryOptions(locale), [locale]);
  const countryLabel = countries.find(
    (option) => option.value === values.country,
  )?.label;
  const cardStyle = deriveCardAccent(premiumLook ? theme.accent : FREE_ACCENT);

  const closeSheet = () => {
    if (sheet === 'style') onStyleClose();
    cancelPick();
    setSheet(null);
    setFlash(sheet);
    setTimeout(() => setFlash(null), 900);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the bio text and edit mode change the textarea height
  useLayoutEffect(() => {
    const element = bioRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [values.bio, mode]);

  const openSheet = (next: EditorSheet) => {
    setLanguagePick(null);
    setCountryPicking(false);
    setSheet(next);
  };

  const setTargets = (rows: ProfileFormValues['targetLanguages']) =>
    setValue('targetLanguages', rows, {
      shouldDirty: true,
      shouldValidate: true,
    });

  const onInvalid = (invalid: FieldErrors<ProfileFormValues>) => {
    setMode('edit');
    if (invalid.primaryLanguage || invalid.targetLanguages)
      openSheet('languages');
    else if (invalid.bio) setTimeout(() => bioRef.current?.focus());
    else if (invalid.country || invalid.timezone) openSheet('location');
    else if (invalid.tags) openSheet('tags');
  };

  const targetError = Array.isArray(errors.targetLanguages)
    ? errors.targetLanguages.find(Boolean)?.language?.message
    : errors.targetLanguages?.message;

  const pickOptions =
    languagePick?.kind === 'primary'
      ? allLanguages.filter(
          (option) =>
            !targetLanguages.some((row) => row.language === option.value),
        )
      : allLanguages.filter(
          (option) =>
            option.value ===
              (languagePick
                ? targetLanguages[languagePick.index]?.language
                : '') ||
            (option.value !== values.primaryLanguage &&
              !targetLanguages.some((row) => row.language === option.value)),
        );

  const cancelPick = () => {
    if (
      languagePick?.kind === 'target' &&
      !targetLanguages[languagePick.index]?.language
    )
      setTargets(
        targetLanguages.filter((_, index) => index !== languagePick.index),
      );
    setLanguagePick(null);
  };

  const pickLanguage = (code: string) => {
    if (!languagePick) return;
    if (languagePick.kind === 'primary') {
      setValue('primaryLanguage', code, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setTargets(
        targetLanguages.map((row, index) =>
          index === languagePick.index ? { ...row, language: code } : row,
        ),
      );
    }
    setLanguagePick(null);
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto w-full max-w-xl pb-24 font-figtree"
    >
      <div className="flex min-h-[52px] items-center justify-between gap-3 pt-1 pr-3 pb-2 pl-4">
        <h1 className="font-bold text-[28px] leading-tight tracking-[-0.01em]">
          {t('yourCard')}
        </h1>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => openSheet('privacy')}
            className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 font-semibold text-xs ${
              values.isPublic
                ? 'bg-primary-darker text-primary-light'
                : 'bg-overlay text-muted'
            }`}
          >
            {values.isPublic ? (
              <MdPublic size={15} aria-hidden />
            ) : (
              <MdVisibilityOff size={15} aria-hidden />
            )}
            {values.isPublic ? t('statusPublic') : t('statusUnlisted')}
          </button>
          {menuItems.length > 0 ? (
            <SheetIconButton
              label={t('profileOptions')}
              onClick={() => openSheet('menu')}
            >
              <MdMoreVert size={24} />
            </SheetIconButton>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-3">
        {draftNotice}
        {statusMessage}
        <div className="grid grid-cols-2 gap-[3px] rounded-full bg-background-darker p-[3px]">
          {(['edit', 'preview'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`h-9 rounded-full font-semibold text-[13px] transition-colors duration-200 ${
                mode === value
                  ? 'bg-primary-dark text-foreground'
                  : 'text-muted'
              }`}
            >
              {value === 'edit' ? t('modeEdit') : t('modePreview')}
            </button>
          ))}
        </div>
        {mode === 'preview' ? (
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            <MdVisibility size={16} aria-hidden className="text-primary" />
            {t('previewHint')}
          </p>
        ) : null}
      </div>

      <fieldset className="min-w-0 px-3">
        {mode === 'preview' ? (
          // biome-ignore lint/a11y/useKeyWithClickEvents: View public profile in the profile menu is the keyboard path
          // biome-ignore lint/a11y/noStaticElementInteractions: the whole preview card is the tap target
          <div
            onClick={(event) => {
              if (!(event.target as Element).closest('button, a, audio'))
                setPublicOpen(true);
            }}
            className="cursor-pointer"
          >
            <ProfileCard
              profile={previewProfile}
              variant="preview"
              bioFallback={t('previewBioFallback')}
              emptyTagsLabel={t('previewNoTags')}
            />
          </div>
        ) : (
          <div style={cardStyle} className="flex flex-col px-1">
            <div
              className={`overflow-hidden rounded-3xl bg-background-dark ${flash === 'style' || flash === 'name' ? flashClass : ''}`}
            >
              <button
                type="button"
                aria-label={t('cardStyle')}
                onClick={() => openSheet('style')}
                className="relative block h-[92px] w-full"
                style={{ background: theme.banner }}
              >
                <span className="absolute top-2.5 right-2.5 flex h-8 items-center gap-1.5 rounded-full bg-black/40 pr-3 pl-2.5 font-semibold text-[13px] text-white backdrop-blur-sm">
                  <MdPalette size={16} aria-hidden />
                  {t(
                    values.cardColor === CUSTOM_CARD_THEME_ID
                      ? 'cardColorCustom'
                      : (COLOR_LABEL_KEYS[values.cardColor ?? ''] ??
                          'cardColorSky'),
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openSheet('name')}
                className="-mt-[30px] relative flex w-full items-end gap-3 px-3.5 pb-3.5 text-left"
              >
                <span className="flex flex-shrink-0 rounded-full bg-background-dark p-1">
                  <Avatar avatarUrl={userAvatarUrl} size="md" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px] pt-9 pb-1">
                  <span className="truncate font-bold text-lg">
                    {displayName}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted text-xs">
                    <FaDiscord size={14} aria-hidden className="opacity-70" />
                    {t('nameSyncedHint')}
                  </span>
                </span>
                <MdChevronRight
                  size={20}
                  aria-hidden
                  className="mb-2 flex-shrink-0 text-subtle"
                />
              </button>
            </div>

            <EditGroup
              title={t('languagesTitle')}
              count={`${targetLanguages.length}/${languageCap}`}
            >
              <ListRow
                label={t('nativeLabel')}
                value={
                  values.primaryLanguage
                    ? getLanguageName(values.primaryLanguage, locale)
                    : t('addShort')
                }
                flash={flash === 'languages'}
                onClick={() => openSheet('languages')}
              />
              {targetLanguages
                .filter((row) => row.language)
                .map((row) => (
                  <ListRow
                    key={row.language}
                    label={getLanguageName(row.language, locale)}
                    value={row.level ? <LevelMeter level={row.level} /> : null}
                    flash={flash === 'languages'}
                    onClick={() => openSheet('languages')}
                  />
                ))}
              {targetLanguages.length < languageCap ? (
                <ListRow
                  add
                  label={t('addLanguage')}
                  onClick={() => openSheet('languages')}
                />
              ) : null}
            </EditGroup>
            {errors.primaryLanguage || targetError ? (
              <FieldError id="mobile-languages-error">
                {t((errors.primaryLanguage?.message ?? targetError) as string)}
              </FieldError>
            ) : null}

            <EditGroup title={t('aboutYouTitle')}>
              <label className="relative flex min-h-[52px] w-full cursor-text flex-col gap-1.5 px-4 py-3 before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-line first:before:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`font-medium text-[13px] ${errors.bio ? 'text-danger' : 'text-subtle'}`}
                  >
                    {t('bioLabel')}
                  </span>
                  <span
                    className={`text-xs ${errors.bio ? 'text-danger' : 'text-subtle'}`}
                  >
                    {t('bioCounter', {
                      count: values.bio.length,
                      max: BIO_MAX,
                    })}
                  </span>
                </span>
                <textarea
                  {...bioField}
                  ref={(element) => {
                    bioField.ref(element);
                    bioRef.current = element;
                  }}
                  id="mobile-bio"
                  aria-label={t('bioLabel')}
                  rows={3}
                  placeholder={t('bioPlaceholder')}
                  aria-invalid={Boolean(errors.bio)}
                  aria-describedby={errors.bio ? 'mobile-bio-error' : undefined}
                  onChange={(event) => {
                    void bioField.onChange(event);
                    if (errors.bio) void trigger('bio');
                  }}
                  onBlur={(event) => {
                    void bioField.onBlur(event);
                    void trigger('bio');
                  }}
                  className="min-h-[66px] w-full resize-none overflow-hidden bg-transparent font-light text-[15px] text-soft leading-normal outline-none placeholder:text-subtle"
                />
                {errors.bio ? (
                  <FieldError id="mobile-bio-error">
                    {t(errors.bio.message as string)}
                  </FieldError>
                ) : null}
              </label>
              <ListRow
                label={t('voiceIntroTitle')}
                meta={
                  premium ? null : (
                    <span className="rounded bg-primary-darker px-1.5 py-0.5 font-bold text-[10px] text-primary-light uppercase tracking-[0.04em]">
                      {t('voiceIntroPremiumTag')}
                    </span>
                  )
                }
                value={
                  premium
                    ? voiceSeconds > 0
                      ? `0:${String(voiceSeconds).padStart(2, '0')}`
                      : t('voiceRecord')
                    : null
                }
                flash={flash === 'voice'}
                onClick={() => openSheet('voice')}
              />
            </EditGroup>

            <EditGroup
              title={t('tagsLabel')}
              count={`${tags.length}/${tagCap}`}
            >
              {tags.length > 0 ? (
                <ListRow
                  stacked
                  label={t('tagsLabel')}
                  flash={flash === 'tags'}
                  onClick={() => openSheet('tags')}
                >
                  <span className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Chip key={tag} label={tag} />
                    ))}
                  </span>
                </ListRow>
              ) : (
                <ListRow
                  add
                  label={t('addTags')}
                  onClick={() => openSheet('tags')}
                />
              )}
            </EditGroup>

            <EditGroup title={t('timePlaceTitle')}>
              <ListRow
                stacked
                label={t('freeTimeLabel')}
                flash={flash === 'availability'}
                onClick={() => openSheet('availability')}
              >
                {values.availability ? (
                  <AvailabilityRow
                    availability={values.availability}
                    ownerTimezone={values.timezone}
                  />
                ) : (
                  <span className="text-muted text-sm">
                    {t('freeTimeHidden')}
                  </span>
                )}
              </ListRow>
              <ListRow
                label={t('countryLabel')}
                value={countryLabel ?? t('addShort')}
                flash={flash === 'location'}
                onClick={() => openSheet('location')}
              />
              <SwitchRow
                label={t('showLocalTime')}
                description={
                  values.displayTimezone && values.timezone
                    ? t('localTimeShown', {
                        time: formatCurrentTime(
                          values.timezone,
                          timeFormat,
                          locale,
                        ),
                      })
                    : t('localTimeHidden')
                }
              >
                <Controller
                  name="displayTimezone"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('showLocalTime')}
                    />
                  )}
                />
              </SwitchRow>
            </EditGroup>

            <EditGroup title={t('visibilityTitle')}>
              <SwitchRow
                label={t('showInDiscover')}
                description={
                  values.isPublic
                    ? t('showInDiscoverOn')
                    : t('showInDiscoverOff')
                }
              >
                <Controller
                  name="isPublic"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('showInDiscover')}
                    />
                  )}
                />
              </SwitchRow>
              <SwitchRow
                label={t('guestsCanCopy')}
                description={t('guestsCanCopyDescription')}
              >
                <Controller
                  name="allowAnonymousCopy"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('guestsCanCopy')}
                    />
                  )}
                />
              </SwitchRow>
            </EditGroup>

            <Button
              variant="outline"
              weight="semibold"
              onClick={() => setPublicOpen(true)}
              className="mt-5 h-[50px] w-full rounded-full text-[15px]"
            >
              {t('viewPublicProfile')}
            </Button>
          </div>
        )}

        {isDirty ? (
          <div className="fixed inset-x-2.5 bottom-[calc(var(--dock-space,0px)+12px)] z-[6] mx-auto flex max-w-xl items-center gap-2 rounded-full border border-line bg-background-darker py-2 pr-2 pl-[18px] shadow-lg">
            <span className="min-w-0 flex-1 font-semibold text-[13px] text-discord-yellow">
              {t('unsavedShort')}
            </span>
            <Button
              variant="outline"
              weight="semibold"
              onClick={onDiscard}
              disabled={isSubmitting}
              className="h-10 rounded-full"
            >
              {t('discard')}
            </Button>
            <Button
              type="submit"
              weight="semibold"
              disabled={isSubmitting}
              className="h-10 rounded-full"
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        ) : null}
      </fieldset>

      <Sheet
        open={sheet === 'style'}
        onOpenChange={(open) => (open ? openSheet('style') : closeSheet())}
        title={t('cardStyle')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {cardStylePicker}
      </Sheet>

      <Sheet
        open={sheet === 'name'}
        onOpenChange={(open) => (open ? openSheet('name') : closeSheet())}
        title={t('nameAndAvatar')}
      >
        <div className="flex flex-col items-center gap-2.5 pt-1 pb-2 text-center">
          <Avatar avatarUrl={userAvatarUrl} size="lg" />
          <p className="font-bold text-xl">{displayName}</p>
          <p className="max-w-[290px] text-[13px] text-muted leading-snug">
            {t('nameSheetDescription')}
          </p>
          <Button
            variant="discord"
            weight="semibold"
            onClick={() =>
              window.location.assign(`/api/auth/discord?locale=${locale}`)
            }
            className="mt-1.5 h-[50px] w-full rounded-full text-[15px]"
          >
            {t('updateConnection')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'languages'}
        onOpenChange={(open) => (open ? openSheet('languages') : closeSheet())}
        full
        flush
        title={
          languagePick
            ? languagePick.kind === 'primary'
              ? t('primaryLanguageLabel')
              : t('chooseLanguage')
            : t('languagesTitle')
        }
        leading={
          languagePick ? (
            <SheetIconButton label={t('back')} onClick={cancelPick}>
              <MdArrowBack size={24} />
            </SheetIconButton>
          ) : undefined
        }
        footer={languagePick ? undefined : footerButton(t('done'), closeSheet)}
      >
        <SheetDrill
          drilled={Boolean(languagePick)}
          main={
            <>
              <SheetLabel>{t('primaryLanguageLabel')}</SheetLabel>
              <SheetGroup>
                <SheetRow
                  label={
                    values.primaryLanguage
                      ? getLanguageName(values.primaryLanguage, locale)
                      : t('chooseLanguage')
                  }
                  chevron
                  onClick={() => setLanguagePick({ kind: 'primary' })}
                />
              </SheetGroup>
              {errors.primaryLanguage ? (
                <FieldError id="mobile-primary-error">
                  {t(errors.primaryLanguage.message as string)}
                </FieldError>
              ) : null}
              <SheetLabel
                aside={t('languageCounterHint', {
                  count: targetLanguages.length,
                  cap: languageCap,
                })}
              >
                {t('targetLanguagesLabel')}
              </SheetLabel>
              <div className="flex flex-col gap-2.5">
                {targetLanguages.map((row, index) => (
                  <div
                    key={row.language || `new-${index}`}
                    className="flex flex-col gap-1.5 rounded-xl bg-background-darker p-1.5 pb-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setLanguagePick({ kind: 'target', index })
                        }
                        className={`flex h-11 min-w-0 flex-1 items-center rounded-lg px-2.5 text-left text-[15px] ${
                          row.language
                            ? 'font-semibold'
                            : 'font-medium text-subtle'
                        }`}
                      >
                        <span className="truncate">
                          {row.language
                            ? getLanguageName(row.language, locale)
                            : t('chooseLanguage')}
                        </span>
                      </button>
                      <SheetIconButton
                        label={t('removeLanguage')}
                        disabled={targetLanguages.length <= 1}
                        onClick={() =>
                          setTargets(
                            targetLanguages.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <MdDeleteOutline size={20} className="text-muted" />
                      </SheetIconButton>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {levels.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          aria-pressed={row.level === level.value}
                          onClick={() =>
                            setTargets(
                              targetLanguages.map((entry, i) =>
                                i === index
                                  ? { ...entry, level: level.value }
                                  : entry,
                              ),
                            )
                          }
                          className={`h-9 truncate rounded-full px-2 font-semibold text-[13px] transition-colors duration-200 ${
                            row.level === level.value
                              ? 'bg-primary-dark text-foreground'
                              : 'bg-background-dark text-muted'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {targetError ? (
                  <FieldError id="mobile-targets-error">
                    {t(targetError)}
                  </FieldError>
                ) : null}
                {targetLanguages.length < languageCap ? (
                  <Ghost
                    icon={MdAdd}
                    label={t('addLanguage')}
                    onClick={() => {
                      setTargets([
                        ...targetLanguages,
                        createEmptyLanguageRow(),
                      ]);
                      setLanguagePick({
                        kind: 'target',
                        index: targetLanguages.length,
                      });
                    }}
                  />
                ) : premium ? null : (
                  <p className="rounded-lg bg-primary-darker px-3.5 py-3 text-[13px] text-soft leading-normal">
                    {t.rich('languageCapUpsell', {
                      freeCap: FREE_LANGUAGE_CAP,
                      premiumCap: PREMIUM_LANGUAGE_CAP,
                      premiumLink: (chunks) => (
                        <a
                          href={`/${locale}/settings#premium`}
                          className="font-bold text-primary-light"
                        >
                          {chunks}
                        </a>
                      ),
                    })}
                  </p>
                )}
              </div>
            </>
          }
          sub={
            languagePick ? (
              <SheetPickList
                key={
                  languagePick.kind === 'primary'
                    ? 'primary'
                    : `target-${languagePick.index}`
                }
                label={t('chooseLanguage')}
                options={pickOptions}
                value={
                  languagePick.kind === 'primary'
                    ? values.primaryLanguage
                    : (targetLanguages[languagePick.index]?.language ?? '')
                }
                onSelect={pickLanguage}
              />
            ) : null
          }
        />
      </Sheet>

      <Sheet
        open={sheet === 'voice'}
        onOpenChange={(open) => (open ? openSheet('voice') : closeSheet())}
        title={t('voiceIntroTitle')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {voiceEditor}
      </Sheet>

      <Sheet
        open={sheet === 'availability'}
        onOpenChange={(open) =>
          open ? openSheet('availability') : closeSheet()
        }
        title={t('freeTimeLabel')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {availabilityEditor}
      </Sheet>

      <Sheet
        open={sheet === 'tags'}
        onOpenChange={(open) => (open ? openSheet('tags') : closeSheet())}
        title={t('tagsLabel')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {tagEditor}
      </Sheet>

      <Sheet
        open={sheet === 'location'}
        onOpenChange={(open) => (open ? openSheet('location') : closeSheet())}
        full
        flush
        title={countryPicking ? t('countryLabel') : t('locationTitle')}
        leading={
          countryPicking ? (
            <SheetIconButton
              label={t('back')}
              onClick={() => setCountryPicking(false)}
            >
              <MdArrowBack size={24} />
            </SheetIconButton>
          ) : undefined
        }
        trailing={
          countryPicking && values.country ? (
            <SheetTextButton
              onClick={() => {
                setValue('country', '', { shouldDirty: true });
                setCountryPicking(false);
              }}
            >
              {t('clearCountry')}
            </SheetTextButton>
          ) : undefined
        }
        footer={
          countryPicking ? undefined : footerButton(t('done'), closeSheet)
        }
      >
        <SheetDrill
          drilled={countryPicking}
          main={
            <>
              <SheetLabel>{t('countryLabel')}</SheetLabel>
              <SheetGroup>
                <SheetRow
                  label={countryLabel ?? t('addCountry')}
                  chevron
                  onClick={() => setCountryPicking(true)}
                />
              </SheetGroup>
              {errors.country ? (
                <FieldError id="mobile-country-error">
                  {t(errors.country.message as string)}
                </FieldError>
              ) : null}
              <SheetLabel>{t('timezoneLabel')}</SheetLabel>
              <div className="flex flex-col gap-2.5">
                <TextInput
                  id="mobile-timezone"
                  aria-label={t('timezoneLabel')}
                  error={Boolean(errors.timezone)}
                  {...register('timezone')}
                />
                {errors.timezone ? (
                  <FieldError id="mobile-timezone-error">
                    {errors.timezone.message}
                  </FieldError>
                ) : null}
                <SheetGroup>
                  <SettingsToggleRow
                    label={t('displayTimezoneLabel')}
                    description={t('displayTimezoneDescription')}
                  >
                    <Controller
                      name="displayTimezone"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={t('displayTimezoneLabel')}
                        />
                      )}
                    />
                  </SettingsToggleRow>
                </SheetGroup>
              </div>
            </>
          }
          sub={
            countryPicking ? (
              <SheetPickList
                label={t('countryLabel')}
                options={countries}
                value={values.country ?? ''}
                onSelect={(code) => {
                  setValue('country', code, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setCountryPicking(false);
                }}
              />
            ) : null
          }
        />
      </Sheet>

      <Sheet
        open={sheet === 'privacy'}
        onOpenChange={(open) => (open ? openSheet('privacy') : closeSheet())}
        title={t('privacySettings')}
      >
        <SheetGroup>
          {(
            [
              ['isPublic', 'makeProfilePublic'],
              ['allowAnonymousCopy', 'allowAnonymousCopying'],
              ['displayTimezone', 'displayTimezone'],
              ['displayAvailability', 'displayAvailability'],
            ] as const
          ).map(([name, key]) => (
            <SettingsToggleRow
              key={name}
              label={t(`${key}Label`)}
              description={t(`${key}Description`)}
            >
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Toggle
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={t(`${key}Label`)}
                  />
                )}
              />
            </SettingsToggleRow>
          ))}
        </SheetGroup>
      </Sheet>

      <ActionSheet
        open={sheet === 'menu'}
        onOpenChange={(open) => setSheet(open ? 'menu' : null)}
        title={t('profileOptions')}
        items={menuItems.map((item) =>
          item.key === 'view'
            ? { ...item, onSelect: () => setPublicOpen(true) }
            : item,
        )}
      />

      <MobileProfileSheet
        profile={previewProfile}
        open={publicOpen}
        onOpenChange={setPublicOpen}
        isLoggedIn
      />
    </form>
  );
};
