'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, type DefaultValues, useForm } from 'react-hook-form';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import {
  Combobox,
  FieldError,
  FormGroup,
  Label,
  Select,
  TextArea,
  TextInput,
} from '@/components/Form';
import {
  availabilityValues,
  countryOptions,
  languageOptions,
  proficiencyOptions,
} from '@/constants';
import { availabilityPresetToPattern } from '@/constants/availability';
import { type DiscoveryProfile, ProfileCard } from '@/features/Discovery';
import { Navbar } from '@/features/Navbar';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import {
  getOnboardingCompletion,
  ONBOARDING_DRAFT_STORAGE_KEY,
} from './completion';
import { type OnboardingFormValues, onboardingSchema } from './schema';

type OnboardingPageProps = {
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
  userAvatarUrl,
  userDisplayName,
}: OnboardingPageProps) => {
  const bioId = useId();
  const timezoneId = useId();
  const tagsInputId = useId();
  const locale = useLocale();
  const router = useRouteProgressRouter();
  const t = useTranslations('Onboarding');
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues,
  });

  const values = watch();
  const tags = values.tags ?? [];
  const localizedLanguageOptions = languageOptions(locale);
  const localizedCountryOptions = countryOptions(locale);
  const localizedProficiencyOptions = proficiencyOptions(locale);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const rawDraft = localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);

    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as Partial<OnboardingFormValues>;
        reset({
          ...defaultValues,
          ...draft,
          timezone: draft.timezone || detectedTimezone,
        });
        setIsDraftReady(true);
        return;
      } catch {
        localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      }
    }

    setValue('timezone', detectedTimezone, { shouldValidate: true });
    setIsDraftReady(true);
  }, [reset, setValue]);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    const draft = JSON.stringify(values);
    localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, draft);
  }, [isDraftReady, values]);

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
      interests: tags,
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
    if (currentTags.length >= 6) return setTagError(t('tagLimitReached'));
    if (
      currentTags
        .map((tag) => tag.toLowerCase())
        .includes(nextTag.toLowerCase())
    ) {
      return setTagError(t('tagDuplicate'));
    }

    setValue('tags', [...currentTags, nextTag], { shouldValidate: true });
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    setValue(
      'tags',
      tags.filter((_, index) => index !== indexToRemove),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    setSubmitError(null);
    setSessionExpired(false);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        setSessionExpired(response.status === 401);
        setSubmitError(
          t(response.status === 401 ? 'sessionExpired' : 'submitError'),
        );
        return;
      }
      localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      setSubmitError(t('submitError'));
    }
  };

  return (
    <div className="min-h-screen bg-background-main text-white">
      <Navbar
        iconUrl={userAvatarUrl}
        isLoggedIn
        notifications={[]}
        onHomeClick={() => router.push(`/${locale}`)}
        onLoginClick={() =>
          window.location.assign(`/api/auth/discord?locale=${locale}`)
        }
        onProfileClick={() => router.push(`/${locale}/profile`)}
        onSavedClick={() => router.push(`/${locale}/saved`)}
        onSettingsClick={() => router.push(`/${locale}/settings`)}
        onLogoutClick={() =>
          window.location.assign(`/api/auth/logout?locale=${locale}`)
        }
      />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg border border-white/5 bg-background-dark shadow-xl"
        >
          <header className="border-white/10 border-b px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar avatarUrl={userAvatarUrl} size="lg" />
                <div>
                  <p className="font-semibold text-primary text-xs uppercase tracking-wide">
                    {t('firstRunSetup')}
                  </p>
                  <h1 className="font-bold font-figtree text-2xl text-white sm:text-3xl">
                    {t('createTitle')}
                  </h1>
                </div>
              </div>
              <div className="min-w-[160px]">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-400">
                    {t('completeness')}
                  </span>
                  <span className="text-primary-light">{completion}%</span>
                </div>
                <div className="h-2 rounded-full bg-background-darker">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 px-4 py-6 sm:px-6">
            {submitError ? (
              <div
                className="rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 text-red-100 text-sm"
                role="alert"
              >
                {submitError}
                {sessionExpired && (
                  <a
                    className="mt-2 block underline"
                    href={`/api/auth/discord?locale=${locale}`}
                  >
                    {t('signInAgain')}
                  </a>
                )}
              </div>
            ) : null}

            <section className="grid gap-4">
              <div>
                <h2 className="font-figtree font-semibold text-white text-xl">
                  {t('languagesSection')}
                </h2>
                <p className="mt-1 text-gray-500 text-sm">
                  {t('languagesSectionDescription')}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                    <FieldError>{errors.primaryLanguage.message}</FieldError>
                  ) : null}
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="targetLanguage" required>
                    {t('targetLanguageLabel')}
                  </Label>
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
                  {errors.targetLanguage ? (
                    <FieldError>{errors.targetLanguage.message}</FieldError>
                  ) : null}
                </FormGroup>

                <FormGroup>
                  <Label required>{t('currentLevelLabel')}</Label>
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
              </div>
            </section>

            <section className="grid gap-4 border-white/10 border-t pt-6">
              <div>
                <h2 className="font-figtree font-semibold text-white text-xl">
                  {t('bioSection')}
                </h2>
                <p className="mt-1 text-gray-500 text-sm">
                  {t('bioSectionDescription')}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    <FieldError>{errors.timezone.message}</FieldError>
                  ) : null}
                </FormGroup>

                <FormGroup>
                  <Label required>{t('availabilityLabel')}</Label>
                  <Controller
                    control={control}
                    name="availability"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        {availabilityValues.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`h-11 rounded-lg border px-3 text-sm transition-colors ${
                              field.value === value
                                ? 'border-primary bg-primary-darker text-primary-light'
                                : 'border-white/10 bg-background-darker text-gray-300 hover:border-primary-dark'
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
              </div>

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
                  <FieldError>{errors.bio.message}</FieldError>
                ) : null}
              </FormGroup>
            </section>

            <section className="grid gap-4 border-white/10 border-t pt-6">
              <div>
                <h2 className="font-figtree font-semibold text-white text-xl">
                  {t('topicsSection')}
                </h2>
                <p className="mt-1 text-gray-500 text-sm">
                  {t('topicsSectionDescription')}
                </p>
              </div>

              <FormGroup>
                <Label htmlFor={tagsInputId}>{t('tagsLabel')}</Label>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-background-darker p-2">
                    {tags.map((tag, index) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-md bg-primary-darker px-2.5 py-1"
                      >
                        <span className="text-primary-light text-sm">
                          {tag}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="text-primary-light transition-colors hover:text-white focus:outline-none"
                          aria-label={t('removeTag', { tag })}
                        >
                          x
                        </button>
                      </span>
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
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="h-11 w-24 shrink-0 rounded-lg border border-white/10 bg-background-darker px-3 font-medium text-gray-300 text-sm transition-colors hover:bg-background-main hover:text-white focus:outline-none focus-visible:bg-background-main focus-visible:text-white"
                  >
                    {t('addTag')}
                  </button>
                </div>
                {tagError ? <FieldError>{tagError}</FieldError> : null}
                {errors.tags?.message ? (
                  <FieldError>{errors.tags.message}</FieldError>
                ) : null}
              </FormGroup>
            </section>
          </div>

          <div className="sticky bottom-0 border-white/10 border-t bg-background-dark px-4 py-4 sm:px-6">
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="h-10">
                {isSubmitting ? t('publishing') : t('publishButton')}
              </Button>
            </div>
          </div>
        </form>

        <aside className="lg:pt-0">
          <div className="sticky top-6 rounded-lg border border-white/5 bg-background-dark p-4 shadow-xl">
            <p className="mb-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
              {t('previewTitle')}
            </p>
            <ProfileCard
              profile={previewProfile}
              variant="preview"
              bioFallback={t('previewBioFallback')}
              emptyTagsLabel={t('previewNoTags')}
            />
          </div>
        </aside>
      </main>
    </div>
  );
};
