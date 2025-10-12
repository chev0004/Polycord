import { Button } from '@/components/Button';
import { Combobox, FormGroup, Label, Select, Toggle } from '@/components/Form';
import { countryOptions, languageOptions } from '@/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MdAdd, MdClose } from 'react-icons/md';
import { type ProfileFormValues, profileSchema } from './schema';

const defaultValues: ProfileFormValues = {
  primaryLanguage: '',
  targetLanguage: '',
  allowAnonymousCopy: true,
  displayTimezone: true,
  bio: '',
  tags: [],
  country: '',
  timezone: '',
  proficiencyLevel: '',
};
export const ProfilePage: React.FC = () => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  useEffect(() => {
    // Automatically detect and set the user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setValue('timezone', userTimezone, { shouldValidate: true });
  }, [setValue]);

  const onSubmit = (data: ProfileFormValues) => {
    console.log('Profile Data Submitted', data);
    // TODO: API call to save profile data
  };

  const translatedProficiencyOptions = [
    { label: t('proficiencyOptionBeginner'), value: 'Beginner' },
    { label: t('proficiencyOptionIntermediate'), value: 'Intermediate' },
    { label: t('proficiencyOptionAdvanced'), value: 'Advanced' },
  ];

  const localizedLanguageOptions = languageOptions(locale);
  const localizedCountryOptions = countryOptions(locale);

  return (
    <div className="mx-auto w-full max-w-4xl p-8">
      <h1 className="mb-8 font-bold font-figtree text-3xl text-white">
        {t('editProfile')}
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 rounded-lg bg-background-dark p-6 shadow-xl"
      >
        {/* Error Message Display */}
        {tagError && (
          <div
            className="rounded-md border border-red-800 bg-red-950/50 p-3 text-red-400 text-sm"
            role="alert"
          >
            {tagError}
          </div>
        )}

        {/* Language Section */}
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
                  options={localizedLanguageOptions}
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
                  options={localizedLanguageOptions}
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
            <Label htmlFor="proficiencyLevel" required>
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

          {/* Country Field */}
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
                />
              )}
            />
            {errors.country && (
              <p className="text-red-500 text-xs">{errors.country.message}</p>
            )}
          </FormGroup>

          {/* Timezone Field */}
          <FormGroup>
            <Label htmlFor="timezone">{t('timezoneLabel')}</Label>
            <input
              id="timezone"
              type="text"
              {...register('timezone')}
              readOnly
              className="h-12 w-full cursor-not-allowed rounded-lg border border-gray-600 bg-background-darker p-3 text-gray-400 focus:outline-none"
              placeholder={t('timezonePlaceholder')}
            />
            {errors.timezone && (
              <p className="text-red-500 text-xs">{errors.timezone.message}</p>
            )}
          </FormGroup>
        </div>

        {/* About Me Section */}
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
              className="min-h-[104px] resize-y rounded-lg border border-gray-600 bg-background-darker p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
            />
            {errors.bio && (
              <p className="text-red-500 text-xs">{errors.bio.message}</p>
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
                if (currentTags.length >= 6) return setTagError(t('maxTags'));
                if (
                  currentTags
                    .map((t) => t.toLowerCase())
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
                  <Label htmlFor="tags">{t('tagsLabel')}</Label>
                  {(field.value ?? []).length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-background-dark p-2">
                      {(field.value || []).map((tag, index) => (
                        <div
                          key={tag}
                          className="flex items-center gap-2 rounded-md bg-primary-darker px-2 py-1"
                        >
                          <span className="h-2 w-2 rounded-full bg-primary-dark" />
                          <span className="text-primary-light text-sm">
                            {tag}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(index)}
                            className="text-primary-light hover:text-white"
                            aria-label={`Remove ${tag}`}
                          >
                            <MdClose size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      id="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder={t('tagsPlaceholder')}
                      className="h-12 flex-grow rounded-lg border border-gray-600 bg-background-darker p-3 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      className="h-12 w-12 flex-shrink-0 px-3"
                      aria-label={t('addTag')}
                    >
                      <MdAdd size={20} />
                    </Button>
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

        {/* Privacy/Settings Section */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('privacySettings')}
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowAnonymousCopy" className="mb-0 font-medium">
                {t('allowAnonymousCopyingLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('allowAnonymousCopyingDescription')}
              </p>
            </div>
            <Controller
              name="allowAnonymousCopy"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="allowAnonymousCopy"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="displayTimezone" className="mb-0 font-medium">
                {t('displayTimezoneLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('displayTimezoneDescription')}
              </p>
            </div>
            <Controller
              name="displayTimezone"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="displayTimezone"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-4">
          {isSubmitting ? t('saving') : t('saveProfile')}
        </Button>
      </form>
    </div>
  );
};
