'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { IconType } from 'react-icons';
import {
  MdAdd,
  MdArrowUpward,
  MdDeleteOutline,
  MdErrorOutline,
  MdMoreVert,
  MdRocketLaunch,
  MdVisibility,
} from 'react-icons/md';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import {
  Combobox,
  FieldError,
  FormGroup,
  Label,
  TextArea,
  TextInput,
  Toggle,
} from '@/components/Form';
import { countryOptions, languageOptions } from '@/constants';
import { availabilityPresetToPattern } from '@/constants/availability';
import { type DiscoveryProfile, ProfileCard } from '@/features/Discovery';
import {
  CUSTOM_CARD_THEME_ID,
  DEFAULT_CARD_COLOR,
  DEFAULT_CUSTOM_GRADIENT,
  findCardTheme,
  getCustomCardTheme,
  getFreeCardTheme,
} from '@/features/Discovery/cardTheme';
import { entitlementLimit } from '@/lib/entitlements';
import { AvailabilityEditor } from './AvailabilityEditor';
import { CardColorPicker } from './CardColorPicker';
import { type ProfileFormValues, profileSchema } from './schema';
import {
  createEmptyLanguageRow,
  TargetLanguagesEditor,
} from './TargetLanguagesEditor';
import { VoiceIntroEditor } from './VoiceIntroEditor';

type ProfilePageProps = {
  boostedUntil?: string;
  boostsRemaining?: number;
  initialValues?: ProfileFormValues;
  onBoostProfile?: () => Promise<void> | void;
  onBumpProfile?: () => void;
  onDeleteProfile?: () => Promise<void> | void;
  onSubmit?: (data: ProfileFormValues) => Promise<void> | void;
  onViewPublicProfile?: () => void;
  premium?: boolean;
  profileId?: string;
  stats?: { views30d: number; copies30d: number; saves: number };
  userAvatarUrl?: string;
  userDisplayName?: string;
};

const FREE_TAG_CAP = entitlementLimit('profile.tags', false);
const PREMIUM_TAG_CAP = entitlementLimit('profile.tags', true);
const PREVIEW_TEASE_VOICE_SECONDS = 12;

const defaultValues: ProfileFormValues = {
  primaryLanguage: '',
  targetLanguages: [createEmptyLanguageRow()],
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  isPublic: true,
  bio: '',
  availability: availabilityPresetToPattern('flexible'),
  tags: [],
  country: '',
  voiceIntroSeconds: 0,
  cardColor: DEFAULT_CARD_COLOR,
  customGradient: DEFAULT_CUSTOM_GRADIENT,
  accentOverride: null,
  timezone: '',
};

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-5 rounded-3xl bg-background-dark p-6 shadow-xl">
    <div className="flex flex-col gap-[3px] border-line border-b pb-3.5">
      <h2 className="font-figtree font-semibold text-[19px] text-primary leading-[1.2]">
        {title}
      </h2>
      {description && <p className="text-[13px] text-subtle">{description}</p>}
    </div>
    <div className="flex flex-col gap-[18px]">{children}</div>
  </section>
);

const SettingsRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-6 rounded-xl bg-background-darker px-4 py-3.5 transition-colors hover:bg-background-main">
    <div className="min-w-0">
      <p className="font-medium text-[15px] text-foreground">{label}</p>
      <p className="mt-0.5 text-[12px] text-subtle">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const MenuItem = ({
  icon: Icon,
  onClick,
  disabled,
  danger,
  children,
}: {
  icon: IconType;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-background-main focus:outline-none focus-visible:bg-background-main disabled:cursor-not-allowed disabled:opacity-60 ${
      danger ? 'hover:!text-danger text-danger' : 'text-foreground'
    }`}
  >
    <Icon size={20} />
    {children}
  </button>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({
  boostedUntil,
  boostsRemaining,
  initialValues,
  onBoostProfile,
  onSubmit: onSubmitProp,
  onBumpProfile,
  onDeleteProfile,
  onViewPublicProfile,
  premium = false,
  profileId,
  stats,
  userAvatarUrl,
  userDisplayName,
}) => {
  const timezoneId = useId();
  const bioId = useId();
  const tagsInputId = useId();
  const t = useTranslations('Profile');
  const locale = useLocale();
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostFailed, setBoostFailed] = useState(false);
  const [tease, setTease] = useState<string | null>(null);

  const boostActive = boostedUntil
    ? new Date(boostedUntil).getTime() > Date.now()
    : false;

  const handleBoostProfile = async () => {
    if (!onBoostProfile || isBoosting) return;

    setIsBoosting(true);
    setBoostFailed(false);

    try {
      await onBoostProfile();
    } catch {
      setBoostFailed(true);
    } finally {
      setIsBoosting(false);
    }
  };

  const tagCap = premium ? PREMIUM_TAG_CAP : FREE_TAG_CAP;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues ?? defaultValues,
  });

  const displayTimezone = watch('displayTimezone');
  const displayAvailability = watch('displayAvailability');
  const allowAnonymousCopy = watch('allowAnonymousCopy');
  const primaryLanguage = watch('primaryLanguage');
  const targetLanguages = watch('targetLanguages') ?? [];
  const country = watch('country');
  const bio = watch('bio');
  const availability = watch('availability');
  const tags = watch('tags') ?? [];
  const timezone = watch('timezone');
  const cardColor = watch('cardColor') ?? DEFAULT_CARD_COLOR;
  const customGradient = watch('customGradient') ?? DEFAULT_CUSTOM_GRADIENT;
  const accentOverride = watch('accentOverride') ?? null;
  const voiceIntroSeconds = watch('voiceIntroSeconds') ?? 0;

  const effectiveCardColor = premium ? cardColor : (tease ?? cardColor);
  const basePreviewTheme =
    premium && effectiveCardColor === CUSTOM_CARD_THEME_ID
      ? getCustomCardTheme(customGradient)
      : (findCardTheme(effectiveCardColor) ?? getFreeCardTheme(0));
  const previewTheme =
    premium && accentOverride
      ? { ...basePreviewTheme, accent: accentOverride }
      : basePreviewTheme;
  const autoAccent = basePreviewTheme.accent;
  const previewIsPremiumLook = premium || Boolean(tease);

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  useEffect(() => {
    if (!displayTimezone) {
      setValue('timezone', '', { shouldValidate: true });
      return;
    }

    if (!timezone) {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setValue('timezone', userTimezone, { shouldValidate: true });
    }
  }, [setValue, displayTimezone, timezone]);

  const onSubmit = async (data: ProfileFormValues) => {
    setTagError(null);
    setSaveFailed(false);
    setDeleteFailed(false);

    if (onSubmitProp) {
      try {
        await onSubmitProp(data);
        reset(data);
      } catch {
        setSaveFailed(true);
      }
    } else {
      reset(data);
    }
  };

  const handleDiscard = () => {
    reset();
    setTagInput('');
    setTagError(null);
    setSaveFailed(false);
    setDeleteFailed(false);
    setTease(null);
  };

  const handleDeleteProfile = async () => {
    if (!onDeleteProfile || isDeleting) {
      return;
    }

    const confirmed = window.confirm(t('deleteProfileConfirmation'));

    if (!confirmed) {
      return;
    }

    setTagError(null);
    setSaveFailed(false);
    setDeleteFailed(false);
    setIsDeleting(true);

    try {
      await onDeleteProfile();
    } catch {
      setDeleteFailed(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const localizedLanguageOptions = languageOptions(locale);
  const localizedCountryOptions = countryOptions(locale);
  const displayName = userDisplayName ?? t('defaultDisplayName');

  const previewProfile = useMemo<DiscoveryProfile>(() => {
    const getLabel = (
      options: { label: string; value: string }[],
      value?: string,
    ) => options.find((option) => option.value === value)?.label ?? '';

    return {
      id: profileId ?? 'profile-preview',
      displayName,
      discordUsername: displayName,
      avatarUrl: userAvatarUrl,
      primaryLanguage: primaryLanguage || t('previewPrimaryFallback'),
      targetLanguages: targetLanguages
        .filter((row) => row.language)
        .map((row) => ({
          language: row.language,
          level: row.level || undefined,
        })),
      about: bio,
      interests: tags,
      country: getLabel(localizedCountryOptions, country),
      timezone: displayTimezone ? timezone : '',
      allowAnonymousCopy,
      lastBumpRelative: t('previewJustNow'),
      premium: previewIsPremiumLook,
      cardTheme: previewTheme,
      availability: displayAvailability
        ? (availability ?? undefined)
        : undefined,
      voiceIntroSeconds: premium
        ? voiceIntroSeconds
        : PREVIEW_TEASE_VOICE_SECONDS,
    };
  }, [
    allowAnonymousCopy,
    availability,
    bio,
    country,
    displayName,
    displayAvailability,
    displayTimezone,
    localizedCountryOptions,
    premium,
    primaryLanguage,
    previewIsPremiumLook,
    previewTheme,
    t,
    tags,
    targetLanguages,
    timezone,
    userAvatarUrl,
    voiceIntroSeconds,
    profileId,
  ]);

  const tagsSchemaError = errors.tags?.message
    ? t(errors.tags.message as string, { cap: tagCap })
    : null;
  const bannerError =
    tagError ??
    tagsSchemaError ??
    (saveFailed ? t('saveError') : null) ??
    (deleteFailed ? t('deleteError') : null) ??
    (boostFailed ? t('boostError') : null);

  return (
    <div className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24">
      <div className="mb-6 flex items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className="font-bold font-figtree text-[30px] text-foreground leading-[1.1]">
            {t('editProfile')}
          </h1>
          <p className="mt-1.5 font-light text-[15px] text-muted">
            {t('editProfileSubtitle')}
          </p>
        </div>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background-dark text-soft transition-colors hover:bg-background-darker hover:text-foreground focus:outline-none focus-visible:bg-background-darker focus-visible:text-foreground"
              aria-label={t('profileOptions')}
            >
              <MdMoreVert size={20} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-[220px] rounded-lg border border-gray-500/50 bg-background-dark p-1 shadow-lg"
              side="bottom"
              align="end"
              sideOffset={6}
            >
              <div className="flex flex-col">
                <MenuItem icon={MdArrowUpward} onClick={onBumpProfile}>
                  {t('bumpProfile')}
                </MenuItem>
                {premium && onBoostProfile ? (
                  <MenuItem
                    icon={MdRocketLaunch}
                    onClick={handleBoostProfile}
                    disabled={
                      isBoosting || boostActive || (boostsRemaining ?? 0) <= 0
                    }
                  >
                    {boostActive
                      ? t('boostActive')
                      : t('boostProfile', { count: boostsRemaining ?? 0 })}
                  </MenuItem>
                ) : null}
                {onViewPublicProfile ? (
                  <MenuItem icon={MdVisibility} onClick={onViewPublicProfile}>
                    {t('viewPublicProfile')}
                  </MenuItem>
                ) : null}
                {onDeleteProfile ? (
                  <>
                    <div className="my-1 h-px bg-overlay" />
                    <MenuItem
                      icon={MdDeleteOutline}
                      danger
                      disabled={isDeleting}
                      onClick={handleDeleteProfile}
                    >
                      {isDeleting ? t('deletingProfile') : t('deleteProfile')}
                    </MenuItem>
                  </>
                ) : null}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="flex min-w-0 flex-col gap-5">
          {bannerError ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-red-800 bg-danger-surface px-3.5 py-3 text-[14px] text-danger"
            >
              <MdErrorOutline size={18} className="shrink-0" />
              {bannerError}
            </div>
          ) : null}

          <SectionCard
            title={t('languageProfile')}
            description={t('languageProfileDescription')}
          >
            <FormGroup>
              <Label htmlFor="primaryLanguage" required>
                {t('primaryLanguageLabel')}
              </Label>
              <Controller
                name="primaryLanguage"
                control={control}
                render={({ field }) => (
                  <Combobox
                    {...field}
                    id="primaryLanguage"
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    options={localizedLanguageOptions}
                    placeholder={t('languageSelectPlaceholder')}
                    error={!!errors.primaryLanguage}
                  />
                )}
              />
              {errors.primaryLanguage && (
                <FieldError>
                  {t(errors.primaryLanguage.message as string)}
                </FieldError>
              )}
            </FormGroup>

            <TargetLanguagesEditor control={control} premium={premium} />

            <FormGroup>
              <Label htmlFor="country">{t('countryLabel')}</Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Combobox
                    {...field}
                    id="country"
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    options={localizedCountryOptions}
                    placeholder={t('countryPlaceholder')}
                    error={!!errors.country}
                  />
                )}
              />
              {errors.country && (
                <FieldError>{errors.country.message}</FieldError>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor={timezoneId}>{t('timezoneLabel')}</Label>
              <TextInput
                id={timezoneId}
                {...register('timezone')}
                placeholder={t('displayTimezoneDescription')}
                error={!!errors.timezone}
              />
              {errors.timezone && (
                <FieldError>{errors.timezone.message}</FieldError>
              )}
            </FormGroup>
          </SectionCard>

          <SectionCard
            title={t('aboutMe')}
            description={t('aboutMeDescription')}
          >
            <Controller
              name="availability"
              control={control}
              render={({ field }) => (
                <AvailabilityEditor
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <FormGroup>
              <Label htmlFor={bioId}>{t('bioLabel')}</Label>
              <TextArea
                id={bioId}
                rows={4}
                {...register('bio')}
                placeholder={t('bioPlaceholder')}
                error={!!errors.bio}
              />
              {errors.bio && (
                <FieldError>{t(errors.bio.message as string)}</FieldError>
              )}
            </FormGroup>

            <Controller
              name="tags"
              control={control}
              render={({ field }) => {
                const currentTags = field.value ?? [];

                const handleAddTag = () => {
                  const newTag = tagInput.trim();

                  if (!newTag) return;
                  if (newTag.length < 2) {
                    setTagError(t('tagTooShort'));
                    return;
                  }
                  if (newTag.length > 20) {
                    setTagError(t('tagTooLong'));
                    return;
                  }
                  if (currentTags.length >= tagCap) {
                    setTagError(t('maxTags', { cap: tagCap }));
                    return;
                  }
                  if (
                    currentTags.some(
                      (tag) => tag.toLowerCase() === newTag.toLowerCase(),
                    )
                  ) {
                    setTagError(t('duplicateTag'));
                    return;
                  }

                  setTagError(null);
                  field.onChange([...currentTags, newTag]);
                  setTagInput('');
                };

                const handleRemoveTag = (indexToRemove: number) => {
                  field.onChange(
                    currentTags.filter((_, index) => index !== indexToRemove),
                  );
                };

                return (
                  <FormGroup>
                    <Label htmlFor={tagsInputId}>{t('tagsLabel')}</Label>
                    {currentTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-background-darker p-2.5">
                        {currentTags.map((tag, index) => (
                          <Chip
                            key={tag}
                            label={tag}
                            onRemove={() => handleRemoveTag(index)}
                            removeLabel={t('removeTag', { tag })}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <TextInput
                        id={tagsInputId}
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder={t('tagsPlaceholder')}
                        className="flex-1"
                        error={!!errors.tags}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        aria-label={t('addTag')}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-light focus:outline-none active:scale-[0.98]"
                      >
                        <MdAdd size={20} />
                      </button>
                    </div>
                    <p className="text-[12px] text-subtle">
                      {t('tagCounterHint', {
                        count: currentTags.length,
                        cap: tagCap,
                      })}
                    </p>
                    {!premium && currentTags.length >= FREE_TAG_CAP && (
                      <p className="text-[13px] text-muted leading-relaxed">
                        {t.rich('tagCapUpsell', {
                          freeCap: FREE_TAG_CAP,
                          premiumCap: PREMIUM_TAG_CAP,
                          strong: (chunks) => (
                            <strong className="font-semibold text-foreground">
                              {chunks}
                            </strong>
                          ),
                        })}
                      </p>
                    )}
                  </FormGroup>
                );
              }}
            />

            <Controller
              name="voiceIntroSeconds"
              control={control}
              render={({ field }) => (
                <VoiceIntroEditor
                  premium={premium}
                  voiceSeconds={field.value ?? 0}
                  onChange={field.onChange}
                />
              )}
            />
          </SectionCard>

          <SectionCard
            title={t('cardStyle')}
            description={t('cardStyleDescription')}
          >
            <Controller
              name="cardColor"
              control={control}
              render={({ field }) => (
                <CardColorPicker
                  value={field.value ?? DEFAULT_CARD_COLOR}
                  onChange={field.onChange}
                  premium={premium}
                  tease={tease}
                  onTease={setTease}
                  customGradient={customGradient}
                  accentOverride={accentOverride}
                  autoAccent={autoAccent}
                  onCustomGradient={(gradient) =>
                    setValue('customGradient', gradient, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onAccentOverride={(color) =>
                    setValue('accentOverride', color, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              )}
            />
          </SectionCard>

          <SectionCard
            title={t('privacySettings')}
            description={t('privacySettingsDescription')}
          >
            <div className="flex flex-col gap-2.5">
              <SettingsRow
                label={t('makeProfilePublicLabel')}
                description={t('makeProfilePublicDescription')}
              >
                <Controller
                  name="isPublic"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('makeProfilePublicLabel')}
                    />
                  )}
                />
              </SettingsRow>

              <SettingsRow
                label={t('allowAnonymousCopyingLabel')}
                description={t('allowAnonymousCopyingDescription')}
              >
                <Controller
                  name="allowAnonymousCopy"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('allowAnonymousCopyingLabel')}
                    />
                  )}
                />
              </SettingsRow>

              <SettingsRow
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
              </SettingsRow>

              <SettingsRow
                label={t('displayAvailabilityLabel')}
                description={t('displayAvailabilityDescription')}
              >
                <Controller
                  name="displayAvailability"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('displayAvailabilityLabel')}
                    />
                  )}
                />
              </SettingsRow>
            </div>
          </SectionCard>

          <div className="sticky bottom-5 z-[6] flex flex-col gap-3 rounded-[18px] border border-line bg-background-darker px-5 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span
              className={`text-[13px] ${isDirty ? 'text-primary-light' : 'text-muted'}`}
            >
              {isDirty ? t('unsavedChanges') : t('allChangesSaved')}
            </span>
            <div className="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
              <Button
                variant="outline"
                onClick={handleDiscard}
                disabled={!isDirty || isSubmitting}
                className="h-10"
              >
                {t('discard')}
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting}
                className="h-10"
              >
                {isSubmitting ? t('saving') : t('saveProfile')}
              </Button>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6">
          <div className="flex flex-col gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
              <MdVisibility size={15} className="text-primary" />
              {t('livePreview')}
            </span>
            <ProfileCard
              profile={previewProfile}
              variant="preview"
              bioFallback={t('previewBioFallback')}
              emptyTagsLabel={t('previewNoTags')}
            />

            {premium && stats ? (
              <div className="mt-2 flex flex-col gap-3 rounded-3xl bg-background-dark p-5 shadow-xl">
                <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                  {t('insightsTitle')}
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-background-darker px-2 py-3">
                    <p className="font-bold text-[20px] text-foreground">
                      {stats.views30d}
                    </p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {t('insightsViews')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background-darker px-2 py-3">
                    <p className="font-bold text-[20px] text-foreground">
                      {stats.copies30d}
                    </p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {t('insightsCopies')}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background-darker px-2 py-3">
                    <p className="font-bold text-[20px] text-foreground">
                      {stats.saves}
                    </p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {t('insightsSaves')}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-subtle">
                  {t('insightsWindowNote')}
                </p>
              </div>
            ) : null}

            {!premium && initialValues ? (
              <div className="mt-2 flex flex-col gap-2 rounded-3xl bg-background-dark p-5 shadow-xl">
                <span className="flex items-center gap-2 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                  {t('insightsTitle')}
                  <span className="inline-flex items-center rounded-full bg-overlay px-[9px] py-0.5 font-bold text-[10.5px] text-soft uppercase tracking-[0.05em]">
                    {t('voiceIntroPremiumTag')}
                  </span>
                </span>
                <p className="text-[13px] text-muted">{t('insightsUpsell')}</p>
              </div>
            ) : null}
          </div>
        </aside>
      </form>
    </div>
  );
};
