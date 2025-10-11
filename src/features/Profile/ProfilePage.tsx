// File: src/features/Profile/ProfilePage.tsx

import { Button } from '@/components/Button';
import { Combobox, FormGroup, Label, Select } from '@/components/Form';
import { zodResolver } from '@hookform/resolvers/zod';
import countryList from 'country-list';
import iso6391 from 'iso-639-1';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { Controller, useForm } from 'react-hook-form';
import timezones from 'timezones-list';
import { type ProfileFormValues, profileSchema } from './schema';

// --- Data Preparation Functions ---

// Creates options in the format { label: string, value: string }[] for Combobox.
// We use the language's native name for the label and its ISO 639-1 code for the value.
const getLanguageOptions = () => {
  return (
    iso6391
      .getAllCodes()
      .map((code) => ({
        label: iso6391.getNativeName(code),
        value: code,
      }))
      // Sort alphabetically by the native name
      .sort((a, b) => a.label.localeCompare(b.label))
  );
};

// Creates options in the format
// { label: string, value: string }[] for Combobox.
const getCountryOptions = () => {
  return countryList.getData().map((country) => ({
    label: country.name,
    value: country.code, // ISO 3166-1 alpha-2 code
  }));
};

// Creates options for timezones.
const getTimezoneOptions = () => {
  return timezones
    .map((tz) => ({
      label: tz.name,
      value: tz.tzCode, // e.g., "Asia/Tokyo"
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// --- Component Definition ---

const defaultValues: ProfileFormValues = {
  primaryLanguage: '',
  targetLanguage: '',
  isPublic: true,
  bio: '',
  interests: '',
  country: '',
  timezone: '',
  proficiencyLevel: undefined,
};

// Load options once on module load
const languageOptions = getLanguageOptions();
const countryOptions = getCountryOptions();
const timezoneOptions = getTimezoneOptions();

export const ProfilePage: React.FC = () => {
  const t = useTranslations('Profile');
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const onSubmit = (data: ProfileFormValues) => {
    console.log('Profile Data Submitted', data);
    // TODO: API call to save profile data
  };

  const translatedProficiencyOptions = [
    { label: t('proficiencyOptionBeginner'), value: 'Beginner' },
    { label: t('proficiencyOptionIntermediate'), value: 'Intermediate' },
    { label: t('proficiencyOptionAdvanced'), value: 'Advanced' },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl p-8">
      <h1 className="mb-8 font-bold font-figtree text-3xl text-white">
        {t('editProfile')}
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 rounded-lg bg-background-dark p-6 shadow-xl"
      >
        {/* --- Language Section --- */}
        <div className="flex flex-col gap-4">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('languageProfile')}
          </h2>

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
                  options={languageOptions}
                  placeholder={t('languageSelectPlaceholder')}
                />
              )}
            />
            {errors.primaryLanguage && (
              <p className="text-red-500 text-xs">
                {errors.primaryLanguage.message}
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
                  options={languageOptions}
                  placeholder={t('languageSelectPlaceholder')}
                />
              )}
            />
            {errors.targetLanguage && (
              <p className="text-red-500 text-xs">
                {errors.targetLanguage.message}
              </p>
            )}
          </FormGroup>

          {/* Proficiency Level Dropdown */}
          <FormGroup>
            <Label htmlFor="proficiencyLevel">
              {t('proficiencyLevelLabel')}
            </Label>
            <Controller
              name="proficiencyLevel"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={translatedProficiencyOptions}
                  placeholder={t('proficiencyLevelPlaceholder')}
                  onValueChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            {errors.proficiencyLevel && (
              <p className="text-red-500 text-xs">
                {errors.proficiencyLevel.message}
              </p>
            )}
          </FormGroup>

          {/* New Optional Field: Country */}
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
                  options={countryOptions}
                  placeholder={t('countryPlaceholder')}
                />
              )}
            />
            {errors.country && (
              <p className="text-red-500 text-xs">{errors.country.message}</p>
            )}
          </FormGroup>

          {/* New Optional Field: Timezone */}
          <FormGroup>
            <Label htmlFor="timezone">{t('timezoneLabel')}</Label>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Combobox
                  {...field}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  options={timezoneOptions}
                  placeholder={t('timezonePlaceholder')}
                />
              )}
            />
            {errors.timezone && (
              <p className="text-red-500 text-xs">{errors.timezone.message}</p>
            )}
          </FormGroup>
        </div>

        {/* --- About Me Section --- */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('aboutMe')}
          </h2>
          <FormGroup>
            <Label htmlFor="bio">{t('bioLabel')}</Label>
            <textarea
              id="bio"
              rows={4}
              {...register('bio')}
              placeholder={t('bioPlaceholder')}
              className="rounded-lg border border-gray-600 bg-background-darker p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
            />
            {errors.bio && (
              <p className="text-red-500 text-xs">{errors.bio.message}</p>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="interests">{t('interestsLabel')}</Label>
            <input
              id="interests"
              type="text"
              {...register('interests')}
              placeholder={t('interestsPlaceholder')}
              className="rounded-lg border border-gray-600 bg-background-darker p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
            />
            {errors.interests && (
              <p className="text-red-500 text-xs">{errors.interests.message}</p>
            )}
          </FormGroup>
        </div>

        {/* --- Privacy/Settings Section --- */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('privacySettings')}
          </h2>

          {/* isPublic Toggle/Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              id="isPublic"
              type="checkbox"
              {...register('isPublic')}
              className="h-4 w-4 rounded border-gray-600 bg-background-darker text-primary focus:ring-primary"
            />

            <Label htmlFor="isPublic" className="font-regular">
              {t('allowAnonymousCopyingLabel')}
              <p className="text-gray-500 text-xs">
                {t('allowAnonymousCopyingDescription')}
              </p>
            </Label>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-4">
          {isSubmitting ? t('saving') : t('saveProfile')}
        </Button>
      </form>
    </div>
  );
};
