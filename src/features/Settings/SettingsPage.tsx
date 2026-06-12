'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/Button';
import {
  FieldError,
  FormGroup,
  Label,
  Select,
  TextInput,
  Toggle,
} from '@/components/Form';
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
  onDeleteAccount: () => Promise<void> | void;
  onExportData: () => Promise<void> | void;
  onSubmit?: (data: SettingsFormValues) => void;
  onUpdateDiscordConnection: () => void;
  onManageSubscription: () => void;
};

type SegmentOption<T extends string> = {
  label: string;
  value: T;
};

const getStoredTimeFormat = (): TimeFormat => {
  if (typeof window === 'undefined') return '24hr';
  const stored = localStorage.getItem('polycord_timeFormat');
  return stored === '12hr' || stored === '24hr' ? stored : '24hr';
};

const sectionNav = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'notifications', label: 'Notifications' },
];

const Section = ({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-6 border-white/10 border-t py-6">
    <div className="mb-5">
      <h2 className="font-figtree font-semibold text-white text-xl">{title}</h2>
      {description && (
        <p className="mt-1 max-w-2xl text-gray-500 text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
    <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-background-darker/70">
      {children}
    </div>
  </section>
);

const SettingsRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,auto)] sm:items-center">
    <div>
      <h3 className="font-medium text-sm text-white">{label}</h3>
      {description && (
        <p className="mt-1 max-w-xl text-gray-500 text-xs leading-relaxed">
          {description}
        </p>
      )}
    </div>
    <div className="sm:justify-self-end">{children}</div>
  </div>
);

const SegmentedControl = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) => (
  <div className="inline-flex rounded-lg border border-white/10 bg-background-dark p-1">
    {options.map((option) => {
      const selected = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-w-24 rounded-md px-3 py-1.5 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            selected
              ? 'bg-primary text-background-dark'
              : 'text-gray-400 hover:bg-background-main hover:text-white'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({
  defaultValues,
  onDeleteAccount,
  onExportData,
  onSubmit: onSubmitProp,
  onUpdateDiscordConnection,
  onManageSubscription,
}) => {
  const t = useTranslations('Settings');
  const currentLocale = useLocale();
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [deleteStatus, setDeleteStatus] = useState<
    'idle' | 'confirming' | 'loading' | 'error'
  >('idle');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const initialValues: SettingsFormValues = useMemo(
    () => ({
      ...defaultValues,
      timeFormat: defaultValues.timeFormat || getStoredTimeFormat(),
    }),
    [defaultValues],
  );

  const {
    register,
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
    }
  };

  const handleExportData = async () => {
    setExportStatus('loading');
    setDeleteStatus('idle');

    try {
      await onExportData();
      setExportStatus('success');
    } catch {
      setExportStatus('error');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE' || deleteStatus === 'loading') {
      return;
    }

    setExportStatus('idle');
    setDeleteStatus('loading');

    try {
      await onDeleteAccount();
    } catch {
      setDeleteStatus('error');
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

  const themeOptions: SegmentOption<SettingsFormValues['theme']>[] = [
    { label: t('themeDark'), value: 'dark' },
    { label: t('themeLight'), value: 'light' },
  ];

  const timeFormatOptions: SegmentOption<SettingsFormValues['timeFormat']>[] = [
    { label: t('timeFormat24hr'), value: '24hr' },
    { label: t('timeFormat12hr'), value: '12hr' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"
      >
        <aside className="hidden lg:block">
          <div className="sticky top-8 rounded-xl border border-white/5 bg-background-dark p-3">
            <p className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide">
              Settings
            </p>
            <nav className="flex flex-col">
              {sectionNav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-lg px-3 py-2 font-medium text-gray-400 text-sm transition-colors hover:bg-background-darker hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="rounded-2xl border border-white/5 bg-background-dark px-4 shadow-xl sm:px-6">
          <header className="py-6">
            <h1 className="font-bold font-figtree text-3xl text-white">
              {t('settingsTitle')}
            </h1>
            <p className="mt-2 max-w-2xl text-gray-500 text-sm leading-relaxed">
              Manage account access, profile visibility, and notification
              behavior from one place.
            </p>
          </header>

          <Section
            id="account"
            title={t('accountTitle')}
            description="Account details and external services."
          >
            <div className="p-4">
              <FormGroup>
                <Label htmlFor="email" required>
                  {t('emailLabel')}
                </Label>
                <TextInput
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder={t('emailPlaceholder')}
                  error={!!errors.email}
                />
                {errors.email && (
                  <FieldError>{t(errors.email.message as string)}</FieldError>
                )}
              </FormGroup>
            </div>

            <SettingsRow
              label={t('updateDiscordConnectionLabel')}
              description={t('updateDiscordConnectionDescription')}
            >
              <Button
                type="button"
                variant="outline"
                onClick={onUpdateDiscordConnection}
                className="h-9 whitespace-nowrap px-3 py-1.5"
              >
                {t('updateDiscordButton')}
              </Button>
            </SettingsRow>

            <SettingsRow
              label={t('premiumMembershipLabel')}
              description={t('premiumMembershipDescription')}
            >
              <Button
                type="button"
                variant="outline"
                onClick={onManageSubscription}
                className="h-9 whitespace-nowrap px-3 py-1.5"
              >
                {t('manageSubscriptionButton')}
              </Button>
            </SettingsRow>

            <SettingsRow
              label={t('exportDataLabel')}
              description={t('exportDataDescription')}
            >
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportData}
                  disabled={exportStatus === 'loading'}
                  className="h-9 whitespace-nowrap px-3 py-1.5"
                >
                  {exportStatus === 'loading'
                    ? t('exportingData')
                    : t('exportDataButton')}
                </Button>
                {exportStatus !== 'idle' && exportStatus !== 'loading' ? (
                  <output
                    className={`text-xs ${
                      exportStatus === 'success'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {exportStatus === 'success'
                      ? t('exportDataSuccess')
                      : t('exportDataError')}
                  </output>
                ) : null}
              </div>
            </SettingsRow>

            <SettingsRow
              label={t('deleteAccountLabel')}
              description={t('deleteAccountDescription')}
            >
              <div className="flex w-full max-w-sm flex-col gap-3 sm:items-end">
                {deleteStatus === 'confirming' ||
                deleteStatus === 'loading' ||
                deleteStatus === 'error' ? (
                  <div className="w-full space-y-2">
                    <Label htmlFor="deleteAccountConfirmation">
                      {t('deleteAccountConfirmationLabel')}
                    </Label>
                    <TextInput
                      id="deleteAccountConfirmation"
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      placeholder={t('deleteAccountConfirmationPlaceholder')}
                      disabled={deleteStatus === 'loading'}
                    />
                    <p className="text-gray-500 text-xs leading-relaxed">
                      {t('deleteAccountRetentionNote')}
                    </p>
                    {deleteStatus === 'error' ? (
                      <p className="text-red-400 text-xs">
                        {t('deleteAccountError')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  {deleteStatus === 'confirming' ||
                  deleteStatus === 'loading' ||
                  deleteStatus === 'error' ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDeleteStatus('idle');
                        setDeleteConfirmation('');
                      }}
                      disabled={deleteStatus === 'loading'}
                      className="h-9 whitespace-nowrap px-3 py-1.5"
                    >
                      {t('cancelDeleteAccount')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      deleteStatus === 'idle'
                        ? () => setDeleteStatus('confirming')
                        : handleDeleteAccount
                    }
                    disabled={
                      deleteStatus === 'loading' ||
                      (deleteStatus !== 'idle' &&
                        deleteConfirmation !== 'DELETE')
                    }
                    className="h-9 whitespace-nowrap border-red-500/60 px-3 py-1.5 text-red-300 hover:bg-red-950/40"
                  >
                    {deleteStatus === 'loading'
                      ? t('deletingAccount')
                      : t('deleteAccountButton')}
                  </Button>
                </div>
              </div>
            </SettingsRow>
          </Section>

          <Section
            id="appearance"
            title={t('appearanceTitle')}
            description="Choose how Polycord displays language and time."
          >
            <div className="p-4">
              <FormGroup>
                <Label htmlFor="applicationLanguage" required>
                  {t('applicationLanguageLabel')}
                </Label>
                <Controller
                  name="applicationLanguage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={localizedLanguageOptions}
                      onValueChange={field.onChange}
                      value={field.value}
                      error={!!errors.applicationLanguage}
                      placeholder={t('appLanguagePlaceholder')}
                    />
                  )}
                />
              </FormGroup>
            </div>

            <SettingsRow
              label={t('themeLabel')}
              description={t('themeDescription')}
            >
              <Controller
                name="theme"
                control={control}
                render={({ field }) => (
                  <SegmentedControl
                    value={field.value}
                    options={themeOptions}
                    onChange={field.onChange}
                  />
                )}
              />
            </SettingsRow>

            <SettingsRow
              label={t('timeFormatLabel')}
              description={t('timeFormatDescription')}
            >
              <Controller
                name="timeFormat"
                control={control}
                render={({ field }) => (
                  <SegmentedControl
                    value={field.value}
                    options={timeFormatOptions}
                    onChange={field.onChange}
                  />
                )}
              />
            </SettingsRow>
          </Section>

          <Section
            id="privacy"
            title={t('privacyTitle')}
            description="Control what other people can discover and copy."
          >
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
              label={t('activityStatusLabel')}
              description={t('activityStatusDescription')}
            >
              <Controller
                name="activityStatus"
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
          </Section>

          <Section
            id="notifications"
            title={t('notificationsTitle')}
            description="Decide which alerts are worth interrupting you."
          >
            <SettingsRow
              label={t('pushNotificationsLabel')}
              description={t('pushNotificationsDescription')}
            >
              <Controller
                name="pushNotifications"
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
              label={t('matchAlertLabel')}
              description={t('matchAlertDescription')}
            >
              <Controller
                name="matchAlert"
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
              label={t('profileInteractionAlertLabel')}
              description={t('profileInteractionAlertDescription')}
            >
              <Controller
                name="profileInteractionAlert"
                control={control}
                render={({ field }) => (
                  <Toggle
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </SettingsRow>
          </Section>

          <div className="-mx-4 sm:-mx-6 sticky bottom-0 border-white/10 border-t bg-background-dark px-4 py-4 sm:px-6">
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="h-10">
                {isSubmitting ? t('saving') : t('saveSettings')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
