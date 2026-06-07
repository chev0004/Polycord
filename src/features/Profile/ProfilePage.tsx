'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Combobox, FormGroup, Label, Select, Toggle } from '@/components/Form';
import {
  availabilityValues,
  countryOptions,
  languageOptions,
  proficiencyOptions,
} from '@/constants';
import { type ProfileFormValues, profileSchema } from './schema';

type ProfilePageProps = {
  initialValues?: ProfileFormValues;
  onDeleteProfile?: () => Promise<void> | void;
  onSubmit?: (data: ProfileFormValues) => Promise<void> | void;
  onViewPublicProfile?: () => void;
  userAvatarUrl?: string;
  userDisplayName?: string;
};

const defaultValues: ProfileFormValues = {
  primaryLanguage: '',
  targetLanguage: '',
  allowAnonymousCopy: true,
  displayTimezone: true,
  isPublic: true,
  bio: '',
  availability: 'flexible',
  tags: [],
  country: '',
  timezone: '',
  proficiencyLevel: '',
};

const inputClasses =
  'h-11 w-full rounded-lg border border-white/10 bg-background-darker px-3 text-white placeholder-gray-500 transition-colors focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark';
const textareaClasses =
  'min-h-[132px] w-full resize-y rounded-lg border border-white/10 bg-background-darker p-3 text-white placeholder-gray-500 transition-colors focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark';

const availabilityLabelKeys: Record<string, string> = {
  weeknights: 'availabilityOptionWeeknights',
  weekends: 'availabilityOptionWeekends',
  weekday_mornings: 'availabilityOptionWeekdayMornings',
  flexible: 'availabilityOptionFlexible',
};

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="border-white/10 border-t py-6">
    <div className="mb-5">
      <h2 className="font-figtree font-semibold text-white text-xl">{title}</h2>
      {description && (
        <p className="mt-1 max-w-2xl text-gray-500 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {children}
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
  <div className="grid gap-3 border-white/5 border-t py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div>
      <h3 className="font-medium text-sm text-white">{label}</h3>
      <p className="mt-1 max-w-xl text-gray-500 text-xs leading-relaxed">
        {description}
      </p>
    </div>
    <div className="sm:justify-self-end">{children}</div>
  </div>
);

const MenuItem = ({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-background-main/50 focus:outline-none ${className ?? 'text-white'}`}
  >
    {children}
  </button>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({
  initialValues,
  onSubmit: onSubmitProp,
  onDeleteProfile,
  onViewPublicProfile,
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'error'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues ?? defaultValues,
  });

  const displayTimezone = watch('displayTimezone');
  const isPublic = watch('isPublic');
  const primaryLanguage = watch('primaryLanguage');
  const targetLanguage = watch('targetLanguage');
  const proficiencyLevel = watch('proficiencyLevel');
  const country = watch('country');
  const bio = watch('bio');
  const tags = watch('tags') ?? [];
  const timezone = watch('timezone');

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
    setSaveStatus('idle');
    setDeleteStatus('idle');

    if (onSubmitProp) {
      try {
        await onSubmitProp(data);
        reset(data);
        setSaveStatus('success');
      } catch {
        setSaveStatus('error');
      }
    } else {
      console.log('Profile Data Submitted', data);
    }
  };

  const handleDeleteProfile = async () => {
    if (!onDeleteProfile || isDeleting) {
      return;
    }

    const confirmed = window.confirm(t('deleteProfileConfirmation'));

    if (!confirmed) {
      return;
    }

    setSaveStatus('idle');
    setDeleteStatus('idle');
    setIsDeleting(true);

    try {
      await onDeleteProfile();
    } catch {
      setDeleteStatus('error');
    } finally {
      setIsDeleting(false);
    }
  };

  const localizedLanguageOptions = languageOptions(locale);
  const localizedCountryOptions = countryOptions(locale);
  const localizedProficiencyOptions = proficiencyOptions(locale);
  const hasProfileMenu = Boolean(onViewPublicProfile || onDeleteProfile);
  const displayName = userDisplayName ?? t('defaultDisplayName');

  const preview = useMemo(() => {
    const getLabel = (
      options: { label: string; value: string }[],
      value?: string,
    ) => options.find((option) => option.value === value)?.label ?? '';

    return {
      primaryLanguage: getLabel(localizedLanguageOptions, primaryLanguage),
      targetLanguage: getLabel(localizedLanguageOptions, targetLanguage),
      proficiencyLevel: getLabel(localizedProficiencyOptions, proficiencyLevel),
      country: getLabel(localizedCountryOptions, country),
    };
  }, [
    country,
    localizedCountryOptions,
    localizedLanguageOptions,
    localizedProficiencyOptions,
    primaryLanguage,
    proficiencyLevel,
    targetLanguage,
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="rounded-2xl border border-white/5 bg-background-dark px-4 shadow-xl sm:px-6">
          <header className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar avatarUrl={userAvatarUrl} size="lg" />
              <div>
                <h1 className="font-bold font-figtree text-3xl text-white">
                  {t('editProfile')}
                </h1>
                <span
                  className={`mt-2 inline-flex rounded-md px-2 py-0.5 font-semibold text-xs ${
                    isPublic
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {isPublic ? t('statusPublic') : t('statusUnlisted')}
                </span>
              </div>
            </div>

            {hasProfileMenu ? (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    className="self-start rounded-lg border border-white/10 px-3 py-2 text-gray-400 text-sm transition-colors hover:bg-background-darker hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={t('profileOptions')}
                  >
                    {t('profileOptionsButton')}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    className="PopoverContent z-50 w-[220px] rounded-lg border border-gray-500/50 bg-background-dark p-1 shadow-lg"
                    side="bottom"
                    align="end"
                    sideOffset={5}
                  >
                    <div className="flex flex-col">
                      {onViewPublicProfile ? (
                        <MenuItem
                          onClick={onViewPublicProfile}
                          className="hover:!text-green-300 text-green-400"
                        >
                          {t('viewPublicProfile')}
                        </MenuItem>
                      ) : null}
                      {onDeleteProfile ? (
                        <MenuItem
                          onClick={handleDeleteProfile}
                          className="hover:!text-red-300 text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isDeleting}
                        >
                          {isDeleting
                            ? t('deletingProfile')
                            : t('deleteProfile')}
                        </MenuItem>
                      ) : null}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            ) : null}
          </header>

          {tagError && (
            <div
              className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-400 text-sm"
              role="alert"
            >
              {tagError}
            </div>
          )}

          {saveStatus !== 'idle' ? (
            <output
              className={`rounded-lg border p-3 text-sm ${
                saveStatus === 'success'
                  ? 'border-green-800 bg-green-950/40 text-green-300'
                  : 'border-red-800 bg-red-950/50 text-red-400'
              }`}
            >
              {saveStatus === 'success' ? t('saveSuccess') : t('saveError')}
            </output>
          ) : null}

          {deleteStatus === 'error' ? (
            <div
              className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-red-400 text-sm"
              role="alert"
            >
              {t('deleteError')}
            </div>
          ) : null}

          <Section
            title={t('languageProfile')}
            description={t('languageProfileDescription')}
          >
            <div className="grid gap-4 md:grid-cols-2">
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
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={localizedLanguageOptions}
                      placeholder={t('languageSelectPlaceholder')}
                      error={!!errors.primaryLanguage}
                    />
                  )}
                />
                {errors.primaryLanguage && (
                  <p className="text-red-500 text-xs">
                    {t(errors.primaryLanguage.message as string)}
                  </p>
                )}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="targetLanguage" required>
                  {t('targetLanguageLabel')}
                </Label>
                <Controller
                  name="targetLanguage"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      {...field}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={localizedLanguageOptions}
                      placeholder={t('languageSelectPlaceholder')}
                      error={!!errors.targetLanguage}
                    />
                  )}
                />
                {errors.targetLanguage && (
                  <p className="text-red-500 text-xs">
                    {t(errors.targetLanguage.message as string)}
                  </p>
                )}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="proficiencyLevel" required>
                  {t('proficiencyLevelLabel')}
                </Label>
                <Controller
                  name="proficiencyLevel"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={localizedProficiencyOptions}
                      placeholder={t('proficiencyLevelPlaceholder')}
                      onValueChange={field.onChange}
                      value={field.value}
                      error={!!errors.proficiencyLevel}
                    />
                  )}
                />
                {errors.proficiencyLevel && (
                  <p className="text-red-500 text-xs">
                    {t(errors.proficiencyLevel.message as string)}
                  </p>
                )}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="country">{t('countryLabel')}</Label>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      {...field}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={localizedCountryOptions}
                      placeholder={t('countryPlaceholder')}
                      error={!!errors.country}
                    />
                  )}
                />
                {errors.country && (
                  <p className="text-red-500 text-xs">
                    {errors.country.message}
                  </p>
                )}
              </FormGroup>

              <FormGroup className="md:col-span-2">
                <Label htmlFor={timezoneId}>{t('timezoneLabel')}</Label>
                <input
                  id={timezoneId}
                  type="text"
                  {...register('timezone')}
                  placeholder={t('displayTimezoneDescription')}
                  className={`${inputClasses} ${
                    errors.timezone ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.timezone && (
                  <p className="text-red-500 text-xs">
                    {errors.timezone.message}
                  </p>
                )}
              </FormGroup>
            </div>
          </Section>

          <Section title={t('aboutMe')} description={t('aboutMeDescription')}>
            <div className="grid gap-4">
              <FormGroup>
                <Label htmlFor="availability">{t('availabilityLabel')}</Label>
                <Controller
                  name="availability"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={availabilityValues.map((value) => ({
                        label: t(availabilityLabelKeys[value]),
                        value,
                      }))}
                      placeholder={t('availabilityPlaceholder')}
                      onValueChange={field.onChange}
                      value={field.value ?? 'flexible'}
                      error={!!errors.availability}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor={bioId}>{t('bioLabel')}</Label>
                <textarea
                  id={bioId}
                  rows={4}
                  {...register('bio')}
                  placeholder={t('bioPlaceholder')}
                  className={`${textareaClasses} ${
                    errors.bio ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.bio && (
                  <p className="text-red-500 text-xs">
                    {t(errors.bio.message as string)}
                  </p>
                )}
              </FormGroup>

              <Controller
                name="tags"
                control={control}
                render={({ field }) => {
                  const handleAddTag = () => {
                    const newTag = tagInput.trim();
                    const currentTags = field.value || [];
                    setTagError(null);

                    if (!newTag) return;
                    if (newTag.length < 2) return setTagError(t('tagTooShort'));
                    if (newTag.length > 20) return setTagError(t('tagTooLong'));
                    if (currentTags.length >= 6)
                      return setTagError(t('maxTags'));
                    if (
                      currentTags
                        .map((tag) => tag.toLowerCase())
                        .includes(newTag.toLowerCase())
                    ) {
                      return setTagError(t('duplicateTag'));
                    }

                    field.onChange([...currentTags, newTag]);
                    setTagInput('');
                  };

                  const handleRemoveTag = (indexToRemove: number) => {
                    const currentTags = field.value || [];
                    field.onChange(
                      currentTags.filter((_, index) => index !== indexToRemove),
                    );
                  };

                  return (
                    <FormGroup>
                      <Label htmlFor={tagsInputId}>{t('tagsLabel')}</Label>
                      {(field.value ?? []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-background-darker p-2">
                          {(field.value || []).map((tag, index) => (
                            <div
                              key={tag}
                              className="flex items-center gap-2 rounded-md bg-primary-darker px-2.5 py-1"
                            >
                              <span className="text-primary-light text-sm">
                                {tag}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(index)}
                                className="text-primary-light transition-colors hover:text-white focus:outline-none"
                                aria-label={t('removeTag', { tag })}
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          id={tagsInputId}
                          type="text"
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder={t('tagsPlaceholder')}
                          className={`${inputClasses} flex-grow ${
                            errors.tags
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="h-11 w-24 shrink-0 rounded-lg border border-white/10 bg-background-darker px-3 font-medium text-gray-300 text-sm transition-colors hover:bg-background-main hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {t('addTag')}
                        </button>
                      </div>
                      {errors.tags?.message && (
                        <p className="text-red-500 text-xs">
                          {t(errors.tags.message)}
                        </p>
                      )}
                    </FormGroup>
                  );
                }}
              />
            </div>
          </Section>

          <Section
            title={t('privacySettings')}
            description={t('privacySettingsDescription')}
          >
            <div className="rounded-xl border border-white/5 bg-background-darker/70 px-4">
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
                    />
                  )}
                />
              </SettingsRow>
            </div>
          </Section>

          <div className="-mx-4 sm:-mx-6 sticky bottom-0 border-white/10 border-t bg-background-dark px-4 py-4 sm:px-6">
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="h-10">
                {isSubmitting ? t('saving') : t('saveProfile')}
              </Button>
            </div>
          </div>
        </div>

        <aside>
          <div className="sticky top-8 rounded-2xl border border-white/5 bg-background-dark p-4 shadow-xl">
            <p className="mb-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
              {t('publicPreview')}
            </p>
            <div className="rounded-xl bg-background-darker p-4">
              <div className="flex items-center gap-3">
                <Avatar avatarUrl={userAvatarUrl} size="md" />
                <div>
                  <h2 className="font-semibold text-white">{displayName}</h2>
                  <p className="text-gray-500 text-xs">
                    {isPublic ? t('statusPublic') : t('statusUnlisted')}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {preview.primaryLanguage && (
                  <span className="rounded-md bg-primary-darker px-2 py-1 text-primary-light text-xs">
                    {preview.primaryLanguage}
                  </span>
                )}
                {preview.targetLanguage && (
                  <span className="rounded-md bg-background-main px-2 py-1 text-gray-300 text-xs">
                    {preview.targetLanguage}
                    {preview.proficiencyLevel
                      ? ` / ${preview.proficiencyLevel}`
                      : ''}
                  </span>
                )}
              </div>

              <p className="mt-4 line-clamp-5 text-gray-400 text-sm leading-relaxed">
                {bio || t('bioPlaceholder')}
              </p>

              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-primary-darker px-2 py-1 text-primary-light text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {preview.country && (
                <p className="mt-4 text-gray-500 text-xs">{preview.country}</p>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};
