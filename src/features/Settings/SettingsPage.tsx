import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FaDiscord } from 'react-icons/fa';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Dropdown, FormGroup, Label, Toggle } from '@/components/Form';
import { languageOptions, type TimeFormat } from '@/constants/languages';

const settingsSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),
  activityStatus: z.boolean(),
  pushNotifications: z.boolean(),
  matchAlert: z.boolean(),
  profileInteractionAlert: z.boolean(),
  theme: z.enum(['dark', 'light']),
  applicationLanguage: z.string().min(1),
  timeFormat: z.enum(['12hr', '24hr']),
  email: z
    .string()
    .email({ message: 'emailInvalid' })
    .min(1, { message: 'emailRequired' }),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export type SettingsPageProps = {
  defaultValues: SettingsFormValues;
  onSubmit?: (data: SettingsFormValues) => void;
  onUpdateDiscordConnection: () => void;
  onManageSubscription: () => void;
};

const getStoredTimeFormat = (): TimeFormat => {
  if (typeof window === 'undefined') return '24hr';
  const stored = localStorage.getItem('polycord_timeFormat');
  return stored === '12hr' || stored === '24hr' ? stored : '24hr';
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  defaultValues,
  onSubmit: onSubmitProp,
  onUpdateDiscordConnection,
  onManageSubscription,
}) => {
  const t = useTranslations('Settings');
  const currentLocale = useLocale();

  const initialValues: SettingsFormValues = useMemo(
    () => ({
      ...defaultValues,
      timeFormat: defaultValues.timeFormat || getStoredTimeFormat(),
    }),
    [defaultValues],
  );

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = (data: SettingsFormValues) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('polycord_timeFormat', data.timeFormat);
      window.dispatchEvent(new Event('timeFormatChanged'));
    }

    if (onSubmitProp) {
      onSubmitProp(data);
    } else {
      console.log('Settings Data Submitted', data);
    }
  };

  const localizedLanguageOptions = useMemo(
    () =>
      languageOptions(currentLocale).map((option) => ({
        ...option,
        label: `${option.label} (${option.value.toUpperCase()})`,
      })),
    [currentLocale],
  );

  const hasApplicationLanguageError = useMemo(
    () => !!errors.applicationLanguage,
    [errors.applicationLanguage],
  );

  const themeOptions = [
    { label: t('themeDark'), value: 'dark' },
    { label: t('themeLight'), value: 'light' },
  ];

  const timeFormatOptions = [
    { label: t('timeFormat24hr'), value: '24hr' },
    { label: t('timeFormat12hr'), value: '12hr' },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl p-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 rounded-3xl bg-background-dark p-6 shadow-xl"
      >
        <h1 className="font-bold font-figtree text-3xl text-white">
          {t('settingsTitle')}
        </h1>

        {/* Account Section */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('accountTitle')}
          </h2>

          {/* Email Field */}
          <FormGroup>
            <Label htmlFor="email" required>
              {t('emailLabel')}
            </Label>
            <input
              id="email"
              type="email"
              {...control.register('email')}
              placeholder={t('emailPlaceholder')}
              className={`h-12 w-full rounded-lg border bg-background-darker p-3 text-white placeholder-gray-500 ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs">
                {t(errors.email.message as string)}
              </p>
            )}
          </FormGroup>

          {/* Update Discord Connection */}
          <FormGroup className="flex-row items-center justify-between">
            <div>
              <Label className="mb-0 text-center font-medium">
                {t('updateDiscordConnectionLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('updateDiscordConnectionDescription')}
              </p>
            </div>
            <Button
              type="button"
              variant="discord"
              icon={FaDiscord}
              onClick={onUpdateDiscordConnection}
              className="h-10 px-4 py-2 text-sm"
            >
              {t('updateDiscordButton')}
            </Button>
          </FormGroup>

          {/* Premium Membership */}
          <FormGroup className="flex-row items-center justify-between">
            <div>
              <Label className="mb-0 text-center font-medium">
                {t('premiumMembershipLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('premiumMembershipDescription')}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={onManageSubscription}
              className="h-10 px-4 py-2 text-sm"
            >
              {t('manageSubscriptionButton')}
            </Button>
          </FormGroup>
        </div>

        {/* Appearance Section */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('appearanceTitle')}
          </h2>

          {/* Application Language */}
          <FormGroup>
            <Label htmlFor="applicationLanguage" required>
              {t('applicationLanguageLabel')}
            </Label>
            <Controller
              name="applicationLanguage"
              control={control}
              render={({ field }) => (
                <Dropdown
                  variant="default"
                  fullWidth
                  searchable
                  options={localizedLanguageOptions}
                  onValueChange={field.onChange}
                  value={field.value}
                  error={hasApplicationLanguageError}
                  placeholder="Select app language"
                />
              )}
            />
          </FormGroup>

          {/* Theme Switch */}
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0 whitespace-nowrap">
              <Label htmlFor="theme" className="mb-0 font-medium">
                {t('themeLabel')}
              </Label>
              <p className="text-gray-500 text-xs">{t('themeDescription')}</p>
            </div>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <Dropdown
                  variant="default"
                  options={themeOptions}
                  onValueChange={field.onChange}
                  value={field.value}
                  className="w-auto min-w-[180px] flex-shrink-0"
                  placeholder="Select theme"
                />
              )}
            />
          </div>

          {/* Time Format */}
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0 whitespace-nowrap">
              <Label htmlFor="timeFormat" className="mb-0 font-medium">
                {t('timeFormatLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('timeFormatDescription')}
              </p>
            </div>
            <Controller
              name="timeFormat"
              control={control}
              render={({ field }) => (
                <Dropdown
                  variant="default"
                  options={timeFormatOptions}
                  onValueChange={field.onChange}
                  value={field.value}
                  className="w-auto min-w-[180px] flex-shrink-0"
                  placeholder="Select format"
                />
              )}
            />
          </div>
        </div>

        {/* Privacy Section */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('privacyTitle')}
          </h2>

          {/* Make Profile Public */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isPublic" className="mb-0 font-medium">
                {t('makeProfilePublicLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('makeProfilePublicDescription')}
              </p>
            </div>
            <Controller
              name="isPublic"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="isPublic"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Activity Status */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="activityStatus" className="mb-0 font-medium">
                {t('activityStatusLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('activityStatusDescription')}
              </p>
            </div>
            <Controller
              name="activityStatus"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="activityStatus"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Allow Anonymous Copy */}
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

          {/* Display Timezone */}
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

        {/* Notifications Section */}
        <div className="flex flex-col gap-4 border-gray-700 border-t pt-6">
          <h2 className="font-figtree font-semibold text-primary text-xl">
            {t('notificationsTitle')}
          </h2>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pushNotifications" className="mb-0 font-medium">
                {t('pushNotificationsLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('pushNotificationsDescription')}
              </p>
            </div>
            <Controller
              name="pushNotifications"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="pushNotifications"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Match Alert */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="matchAlert" className="mb-0 font-medium">
                {t('matchAlertLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('matchAlertDescription')}
              </p>
            </div>
            <Controller
              name="matchAlert"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="matchAlert"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Profile Interaction Alert */}
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="profileInteractionAlert"
                className="mb-0 font-medium"
              >
                {t('profileInteractionAlertLabel')}
              </Label>
              <p className="text-gray-500 text-xs">
                {t('profileInteractionAlertDescription')}
              </p>
            </div>
            <Controller
              name="profileInteractionAlert"
              control={control}
              render={({ field }) => (
                <Toggle
                  id="profileInteractionAlert"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-4">
          {isSubmitting ? t('saving') : t('saveSettings')}
        </Button>
      </form>
    </div>
  );
};
