'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, type DefaultValues, useForm } from 'react-hook-form';
import { MdAdd, MdErrorOutline, MdVisibility } from 'react-icons/md';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import {
  Combobox,
  FieldError,
  FormGroup,
  Label,
  Select,
  TextArea,
  TextInput,
} from '@/components/Form';
import { DraftNotice } from '@/components/Form/DraftNotice';
import {
  availabilityValues,
  countryOptions,
  languageOptions,
  proficiencyOptions,
} from '@/constants';
import { availabilityPresetToPattern } from '@/constants/availability';
import { type DiscoveryProfile, ProfileCard } from '@/features/Discovery';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { SectionCard } from '@/features/Profile/SectionCard';
import { useFormDraft } from '@/hooks/useFormDraft';
import { entitlementLimit } from '@/lib/entitlements';
import { SessionExpiredError } from '@/lib/formErrors';
import { getOnboardingCompletion } from './completion';
import {
  createOnboardingSchema,
  type OnboardingFormValues,
  onboardingDraftSchema,
} from './schema';

type OnboardingPageProps = {
  userId: string;
  premium?: boolean;
  userAvatarUrl?: string;
  userDisplayName: string;
};

const defaultValues: DefaultValues<OnboardingFormValues> = {
  primaryLanguage: '',
  targetLanguage: '',
  timezone: '',
  availability: 'flexible',
  bio: '',
  country: '',
  tags: [],
};

const availabilityLabelKeys: Record<string, string> = {
  weeknights: 'availabilityWeeknights',
  weekends: 'availabilityWeekends',
  weekday_mornings: 'availabilityWeekdayMornings',
  flexible: 'availabilityFlexible',
};

export const OnboardingPage = ({
  userId,
  premium = false,
  userAvatarUrl,
  userDisplayName,
}: OnboardingPageProps) => {
  const bioId = useId();
  const timezoneId = useId();
  const tagsInputId = useId();
  const locale = useLocale();
  const router = useRouteProgressRouter();
  const t = useTranslations('Onboarding');
  const tProfile = useTranslations('Profile');
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const tagCap = entitlementLimit('profile.tags', premium);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(createOnboardingSchema(premium)),
    defaultValues,
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = form;

  const values = watch();
  const tags = values.tags ?? [];
  const localizedLanguageOptions = languageOptions(locale);
  const localizedCountryOptions = countryOptions(locale);
  const localizedProficiencyOptions = proficiencyOptions(locale);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setValue('timezone', detectedTimezone, { shouldValidate: true });
    try {
      localStorage.removeItem('polycord_onboarding_draft');
    } catch {}
  }, [setValue]);

  const draft = useFormDraft(
    `polycord:onboarding:${userId}`,
    form,
    onboardingDraftSchema,
  );

  const completion = useMemo(() => getOnboardingCompletion(values), [values]);

  const previewProfile = useMemo<DiscoveryProfile>(() => {
    const countryLabel =
      localizedCountryOptions.find((option) => option.value === values.country)
        ?.label ?? '';

    return {
      id: 'onboarding-preview',
      displayName: userDisplayName,
      discordUsername: userDisplayName,
      avatarUrl: userAvatarUrl,
      primaryLanguage: values.primaryLanguage || t('previewPrimaryFallback'),
      targetLanguages: values.targetLanguage
        ? [
            {
              language: values.targetLanguage,
              level: values.proficiencyLevel || undefined,
            },
          ]
        : [],
      about: values.bio,
      tags,
      country: countryLabel,
      timezone: values.timezone,
      availability: values.availability
        ? availabilityPresetToPattern(values.availability)
        : undefined,
    };
  }, [
    localizedCountryOptions,
    t,
    tags,
    userAvatarUrl,
    userDisplayName,
    values.availability,
    values.bio,
    values.country,
    values.primaryLanguage,
    values.proficiencyLevel,
    values.targetLanguage,
    values.timezone,
  ]);

  const addTag = () => {
    const nextTag = tagInput.trim();
    const currentTags = tags;
    setTagError(null);

    if (!nextTag) return;
    if (nextTag.length < 2) return setTagError(t('tagTooShort'));
    if (nextTag.length > 20) return setTagError(t('tagTooLong'));
    if (currentTags.length >= tagCap)
      return setTagError(t('tagLimitReached', { cap: tagCap }));
    if (
      currentTags
        .map((tag) => tag.toLowerCase())
        .includes(nextTag.toLowerCase())
    ) {
      return setTagError(t('tagDuplicate'));
    }

    setValue('tags', [...currentTags, nextTag], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    setValue(
      'tags',
      tags.filter((_, index) => index !== indexToRemove),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    setSessionExpired(false);
    setSubmitError(null);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.status === 401) throw new SessionExpiredError();
      if (!response.ok) throw new Error('Onboarding save failed');
      reset(data);
      draft.clear();
      router.push(`/${locale}`);
      router.refresh();
    } catch (error) {
      const expired = error instanceof SessionExpiredError;
      setSessionExpired(expired);
      setSubmitError(t(expired ? 'sessionExpired' : 'submitError'));
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1140px] px-4 pt-8 pb-24 sm:px-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6">
          <h1 className="font-bold font-figtree text-[30px] text-foreground leading-[1.1]">
            {t('createTitle')}
          </h1>
          <p className="mt-1.5 font-light text-[15px] text-muted">
            {t('createSubtitle')}
          </p>
        </div>

        <DraftNotice {...draft} sessionExpired={sessionExpired} />
        <fieldset
          disabled={!draft.ready}
          className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="flex min-w-0 flex-col gap-5">
            {submitError ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-red-800 bg-danger-surface px-3.5 py-3 text-[14px] text-danger"
              >
                <MdErrorOutline size={18} className="shrink-0" />
                {submitError}
              </div>
            ) : null}

            <SectionCard
              title={t('languagesSection')}
              description={t('languagesSectionDescription')}
            >
              <FormGroup>
                <Label htmlFor="primaryLanguage" required>
                  {t('primaryLanguageLabel')}
                </Label>
                <Controller
                  control={control}
                  name="primaryLanguage"
                  render={({ field }) => (
                    <Combobox
                      {...field}
                      id="primaryLanguage"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={localizedLanguageOptions}
                      placeholder={t('primaryLanguagePlaceholder')}
                      error={!!errors.primaryLanguage}
                    />
                  )}
                />
                {errors.primaryLanguage ? (
                  <FieldError id="primaryLanguage-error">
                    {errors.primaryLanguage.message}
                  </FieldError>
                ) : null}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="targetLanguage" required>
                  {t('targetLanguageLabel')}
                </Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
                  <Controller
                    control={control}
                    name="targetLanguage"
                    render={({ field }) => (
                      <Combobox
                        {...field}
                        id="targetLanguage"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={localizedLanguageOptions}
                        placeholder={t('targetLanguagePlaceholder')}
                        error={!!errors.targetLanguage}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="proficiencyLevel"
                    render={({ field }) => (
                      <Select
                        {...field}
                        ariaLabel={t('currentLevelLabel')}
                        options={localizedProficiencyOptions}
                        placeholder={t('currentLevelPlaceholder')}
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        error={!!errors.proficiencyLevel}
                      />
                    )}
                  />
                </div>
                {errors.targetLanguage ? (
                  <FieldError id="targetLanguage-error">
                    {errors.targetLanguage.message}
                  </FieldError>
                ) : null}
                {errors.proficiencyLevel ? (
                  <FieldError>{errors.proficiencyLevel.message}</FieldError>
                ) : null}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="country">{t('countryLabel')}</Label>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Combobox
                      {...field}
                      id="country"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      options={localizedCountryOptions}
                      placeholder={t('countryPlaceholder')}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor={timezoneId} required>
                  {t('timezoneLabel')}
                </Label>
                <TextInput
                  id={timezoneId}
                  {...register('timezone')}
                  placeholder={t('timezonePlaceholder')}
                  error={!!errors.timezone}
                />
                {errors.timezone ? (
                  <FieldError id={`${timezoneId}-error`}>
                    {errors.timezone.message}
                  </FieldError>
                ) : null}
              </FormGroup>
            </SectionCard>

            <SectionCard
              title={t('aboutSection')}
              description={t('aboutSectionDescription')}
            >
              <FormGroup>
                <Label required>{t('availabilityLabel')}</Label>
                <Controller
                  control={control}
                  name="availability"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {availabilityValues.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          aria-pressed={field.value === value}
                          className={`whitespace-nowrap rounded-lg border px-1 py-[9px] font-medium text-[13px] transition-colors focus:outline-none ${
                            field.value === value
                              ? 'border-primary-dark bg-primary-darker text-primary-light'
                              : 'border-line bg-background-darker text-soft hover:bg-background-main hover:text-foreground'
                          }`}
                        >
                          {t(availabilityLabelKeys[value])}
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.availability ? (
                  <FieldError>{errors.availability.message}</FieldError>
                ) : null}
              </FormGroup>

              <FormGroup>
                <Label htmlFor={bioId} required>
                  {t('bioLabel')}
                </Label>
                <TextArea
                  id={bioId}
                  rows={4}
                  {...register('bio')}
                  placeholder={t('bioPlaceholder')}
                  error={!!errors.bio}
                />
                {errors.bio ? (
                  <FieldError id={`${bioId}-error`}>
                    {errors.bio.message}
                  </FieldError>
                ) : null}
              </FormGroup>

              <FormGroup>
                <Label htmlFor={tagsInputId}>{t('tagsLabel')}</Label>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-background-darker p-2.5">
                    {tags.map((tag, index) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onRemove={() => removeTag(index)}
                        removeLabel={t('removeTag', { tag })}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <TextInput
                    id={tagsInputId}
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder={t('tagsPlaceholder')}
                    className="flex-1"
                    error={!!tagError || !!errors.tags}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    aria-label={t('addTag')}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-light focus:outline-none focus-visible:bg-primary-light active:scale-[0.98]"
                  >
                    <MdAdd size={20} />
                  </button>
                </div>
                <p className="text-[12px] text-subtle">
                  {tProfile('tagCounterHint', {
                    count: tags.length,
                    cap: tagCap,
                  })}
                </p>
                {tagError ? <FieldError>{tagError}</FieldError> : null}
                {errors.tags?.message ? (
                  <FieldError>
                    {errors.tags.message === 'tagLimitReached'
                      ? t('tagLimitReached', { cap: tagCap })
                      : errors.tags.message}
                  </FieldError>
                ) : null}
              </FormGroup>
            </SectionCard>

            <div className="sticky bottom-[calc(var(--dock-space,0px)+20px)] z-[6] flex flex-col gap-3 rounded-[18px] border border-line bg-background-darker px-5 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-3 text-[13px]">
                <span className="text-muted">{t('completeness')}</span>
                <div className="h-1.5 w-[120px] rounded-full bg-background-dark">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <span className="text-primary-light">{completion}%</span>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    reset();
                    draft.clear();
                  }}
                  disabled={isSubmitting}
                  className="h-10"
                >
                  {t('discardDraft')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="h-10">
                  {isSubmitting ? t('publishing') : t('publishButton')}
                </Button>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6">
            <div className="flex flex-col gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                <MdVisibility size={15} className="text-primary" />
                {t('previewTitle')}
              </span>
              <ProfileCard
                profile={previewProfile}
                variant="preview"
                bioFallback={t('previewBioFallback')}
                emptyTagsLabel={t('previewNoTags')}
              />
            </div>
          </aside>
        </fieldset>
      </form>
    </main>
  );
};
