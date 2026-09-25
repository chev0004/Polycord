'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FaDiscord } from 'react-icons/fa';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import {
  FieldError,
  FormGroup,
  Label,
  Select,
  TextInput,
  Toggle,
} from '@/components/Form';
import { DraftNotice } from '@/components/Form/DraftNotice';
import { languageOptions } from '@/constants/languages';
import { ReturnLink } from '@/features/Navigation/ReturnLink';
import { useFormDraft } from '@/hooks/useFormDraft';
import { SessionExpiredError } from '@/lib/formErrors';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationState,
} from '@/lib/push/client';
import { isLocale } from '@/utils/localePaths';
import { CompareTable } from './CompareTable';
import {
  type SettingsFormValues,
  settingsDraftSchema,
  settingsSchema,
} from './schema';

export type { SettingsFormValues };

export type SettingsPageProps = {
  userId?: string;
  blockedUsers?: React.ReactNode;
  defaultValues: SettingsFormValues;
  onDeleteAccount: () => Promise<'billing-error' | undefined> | undefined;
  onExportData: () => Promise<void> | void;
  onSubmit?: (data: SettingsFormValues) => Promise<void> | void;
  onUpdateDiscordConnection: () => void;
  onManageSubscription: () => Promise<void> | void;
  premium?: boolean;
  subscriptionRenewsAt?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  userAvatarUrl?: string;
  userDisplayName: string;
};

type SectionId =
  | 'account'
  | 'premium'
  | 'appearance'
  | 'privacy'
  | 'notifications';

const sections: { id: SectionId; labelKey: string }[] = [
  { id: 'account', labelKey: 'accountTitle' },
  { id: 'premium', labelKey: 'premiumTitle' },
  { id: 'appearance', labelKey: 'appearanceTitle' },
  { id: 'privacy', labelKey: 'privacyTitle' },
  { id: 'notifications', labelKey: 'notificationsTitle' },
];

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

const SettingRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-background-darker px-4 py-3.5 transition-colors hover:bg-background-main sm:flex-row sm:items-center sm:gap-6">
    <div className="min-w-0">
      <p className="font-medium text-[15px] text-foreground">{label}</p>
      <p className="mt-0.5 text-[12px] text-subtle">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({
  blockedUsers,
  defaultValues,
  onDeleteAccount,
  onExportData,
  onSubmit: onSubmitProp,
  onUpdateDiscordConnection,
  onManageSubscription,
  premium = false,
  subscriptionRenewsAt,
  subscriptionCancelAtPeriodEnd = false,
  userAvatarUrl,
  userDisplayName,
  userId,
}) => {
  const t = useTranslations('Settings');
  const currentLocale = useLocale();
  const [activeSection, setActiveSection] = useState<SectionId>('account');
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [deleteStatus, setDeleteStatus] = useState<
    'idle' | 'confirming' | 'loading' | 'error' | 'billing-error'
  >('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'error'>('idle');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pushStatus, setPushStatus] = useState<
    'idle' | 'denied' | 'unsupported' | 'error'
  >('idle');
  const [pushBusy, setPushBusy] = useState(false);
  const [billingStatus, setBillingStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleManageSubscription = async () => {
    setBillingStatus('loading');

    try {
      await onManageSubscription();
      setBillingStatus('idle');
    } catch {
      setBillingStatus('error');
    }
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    resetField,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = form;
  const draft = useFormDraft(
    userId ? `polycord:settings:${userId}` : undefined,
    form,
    settingsDraftSchema,
  );
  register('pushNotifications');

  useEffect(() => {
    let active = true;
    void getPushNotificationState().then((state) => {
      if (!active) return;
      resetField('pushNotifications', { defaultValue: state === 'enabled' });
      setPushStatus(
        state === 'enabled' || state === 'disabled' ? 'idle' : state,
      );
    });
    return () => {
      active = false;
    };
  }, [resetField]);

  const handlePushToggle = async (checked: boolean) => {
    setPushBusy(true);
    setPushStatus('idle');
    try {
      if (checked) {
        const result = await enablePushNotifications();
        if (result !== 'enabled') {
          setPushStatus(result);
          return;
        }
      } else {
        await disablePushNotifications();
      }
      resetField('pushNotifications', { defaultValue: checked });
    } catch {
      setPushStatus('error');
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (sections.some((section) => section.id === hash)) {
      setActiveSection(hash as SectionId);
    }
  }, []);

  const jumpToSection = (id: SectionId) => {
    setActiveSection(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  };

  const onSubmit = async (data: SettingsFormValues) => {
    setSessionExpired(false);
    setSaveStatus('idle');

    try {
      await onSubmitProp?.(data);

      reset(data);
      draft.clear();
    } catch (error) {
      setSessionExpired(error instanceof SessionExpiredError);
      setSaveStatus('error');
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    if (formErrors.email) {
      jumpToSection('account');
    }
  };

  const handleDiscard = () => {
    reset();
    draft.clear();
    setExportStatus('idle');
    setDeleteStatus('idle');
    setSaveStatus('idle');
    setDeleteConfirmation('');
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
      if ((await onDeleteAccount()) === 'billing-error') {
        setDeleteStatus('billing-error');
        return;
      }
      reset();
      draft.clear();
    } catch {
      setDeleteStatus('error');
    }
  };

  const localizedLanguageOptions = useMemo(
    () =>
      languageOptions(currentLocale)
        .filter((option) => isLocale(option.value))
        .map((option) => ({
          ...option,
          label: `${option.label} (${option.value.toUpperCase()})`,
        })),
    [currentLocale],
  );

  const themeOptions = [
    { label: t('themeDark'), value: 'dark' },
    { label: t('themeLight'), value: 'light' },
  ];

  const timeFormatOptions = [
    { label: t('timeFormat24hr'), value: '24hr' },
    { label: t('timeFormat12hr'), value: '12hr' },
  ];

  const languageDisplayOptions = [
    { label: t('languageDisplayLong'), value: 'long' },
    { label: t('languageDisplayShort'), value: 'short' },
  ];

  const emailValue = watch('email');

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24"
    >
      <ReturnLink />
      <div className="mb-6">
        <h1 className="font-bold font-figtree text-[30px] text-foreground leading-[1.1]">
          {t('settingsTitle')}
        </h1>
        <p className="mt-1.5 font-light text-[15px] text-muted">
          {t('settingsSubtitle')}
        </p>
      </div>

      {userId ? (
        <DraftNotice {...draft} sessionExpired={sessionExpired} />
      ) : null}
      <fieldset
        disabled={!draft.ready}
        className="grid min-w-0 items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]"
      >
        <aside className="lg:sticky lg:top-6">
          <nav className="flex flex-col gap-3.5 rounded-3xl bg-background-dark p-4 shadow-xl">
            <div className="hidden items-center gap-3 border-line border-b px-1.5 pt-1 pb-3.5 lg:flex">
              <Avatar avatarUrl={userAvatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-[14px] text-foreground">
                  {userDisplayName}
                </p>
                <p className="truncate text-[12px] text-muted">{emailValue}</p>
              </div>
            </div>
            <div className="flex flex-row flex-wrap gap-1 lg:flex-col">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpToSection(section.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center rounded-full px-3 py-2.5 text-left font-medium text-[14px] transition-colors focus:outline-none focus-visible:bg-background-main ${
                      isActive
                        ? 'bg-primary-darker text-primary-light'
                        : 'text-muted hover:bg-background-main hover:text-foreground focus-visible:text-foreground'
                    }`}
                  >
                    {t(section.labelKey)}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          {activeSection === 'account' && (
            <SectionCard
              title={t('accountTitle')}
              description={t('accountDescription')}
            >
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
                <p className="text-[12px] text-subtle">
                  {t('emailDescription')}
                </p>
                {errors.email && (
                  <FieldError id="email-error">
                    {t(errors.email.message as string)}
                  </FieldError>
                )}
              </FormGroup>

              <SettingRow
                label={t('updateDiscordConnectionLabel')}
                description={t('updateDiscordConnectionDescription')}
              >
                <Button
                  variant="discord"
                  weight="semibold"
                  icon={FaDiscord}
                  onClick={onUpdateDiscordConnection}
                  className="h-10 whitespace-nowrap"
                >
                  {t('updateDiscordButton')}
                </Button>
              </SettingRow>

              <SettingRow
                label={t('premiumMembershipLabel')}
                description={
                  premium
                    ? t('premiumMembershipDescriptionPremium')
                    : t('premiumMembershipDescription')
                }
              >
                {premium ? (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={billingStatus === 'loading'}
                    className="h-10 whitespace-nowrap"
                  >
                    {t('manageBillingButton')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => jumpToSection('premium')}
                    className="h-10 whitespace-nowrap"
                  >
                    {t('viewPlansButton')}
                  </Button>
                )}
              </SettingRow>

              <SettingRow
                label={t('exportDataLabel')}
                description={t('exportDataDescription')}
              >
                <div className="flex flex-col items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    disabled={exportStatus === 'loading'}
                    className="h-10 whitespace-nowrap"
                  >
                    {exportStatus === 'loading'
                      ? t('exportingData')
                      : t('exportDataButton')}
                  </Button>
                  {exportStatus === 'success' || exportStatus === 'error' ? (
                    <output
                      className={`text-xs ${
                        exportStatus === 'success'
                          ? 'text-success'
                          : 'text-danger'
                      }`}
                    >
                      {exportStatus === 'success'
                        ? t('exportDataSuccess')
                        : t('exportDataError')}
                    </output>
                  ) : null}
                </div>
              </SettingRow>

              <div className="rounded-xl bg-background-darker px-4 py-3.5">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] text-foreground">
                      {t('deleteAccountLabel')}
                    </p>
                    <p className="mt-0.5 text-[12px] text-subtle">
                      {t('deleteAccountDescription')}
                    </p>
                  </div>
                  {deleteStatus === 'idle' ? (
                    <Button
                      variant="outline"
                      onClick={() => setDeleteStatus('confirming')}
                      className="h-10 whitespace-nowrap border-red-500/60 text-danger hover:bg-danger-surface"
                    >
                      {t('deleteAccountButton')}
                    </Button>
                  ) : null}
                </div>

                {deleteStatus !== 'idle' ? (
                  <div className="mt-3 flex flex-col gap-2">
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
                    <p className="text-[12px] text-subtle leading-relaxed">
                      {t('deleteAccountRetentionNote')}
                    </p>
                    {deleteStatus === 'error' ||
                    deleteStatus === 'billing-error' ? (
                      <p role="alert" className="text-danger text-xs">
                        {t(
                          deleteStatus === 'billing-error'
                            ? 'deleteAccountBillingError'
                            : 'deleteAccountError',
                        )}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeleteStatus('idle');
                          setDeleteConfirmation('');
                        }}
                        disabled={deleteStatus === 'loading'}
                        className="h-10 whitespace-nowrap"
                      >
                        {t('cancelDeleteAccount')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDeleteAccount}
                        disabled={
                          deleteStatus === 'loading' ||
                          deleteConfirmation !== 'DELETE'
                        }
                        className="h-10 whitespace-nowrap border-red-500/60 text-danger hover:bg-danger-surface"
                      >
                        {deleteStatus === 'loading'
                          ? t('deletingAccount')
                          : t('deleteAccountButton')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          )}

          {activeSection === 'premium' && (
            <SectionCard
              title={t('premiumTitle')}
              description={
                premium
                  ? t('premiumTabDescriptionPremium')
                  : t('premiumTabDescriptionFree')
              }
            >
              {premium ? (
                <div className="flex items-center justify-between gap-4 rounded-xl bg-background-darker px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-[5px]">
                      <span className="font-bold text-[26px] text-foreground tracking-[-0.01em]">
                        {t('premiumPriceAmount')}
                      </span>
                      <span className="text-[13px] text-muted">
                        {t('premiumPriceRenewal')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-subtle">
                      {t('premiumPlanNote')}
                    </p>
                    {subscriptionRenewsAt ? (
                      <p className="mt-0.5 text-[12.5px] text-subtle">
                        {t(
                          subscriptionCancelAtPeriodEnd
                            ? 'billingEnds'
                            : 'billingRenews',
                          {
                            date: new Date(
                              subscriptionRenewsAt,
                            ).toLocaleDateString(currentLocale),
                          },
                        )}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={billingStatus === 'loading'}
                    className="h-10 whitespace-nowrap"
                  >
                    {t('manageBillingButton')}
                  </Button>
                </div>
              ) : null}

              <CompareTable />

              {premium ? null : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-subtle">
                    {t('premiumUpgradeNote')}
                  </span>
                  <Button
                    onClick={handleManageSubscription}
                    disabled={billingStatus === 'loading'}
                    className="h-9 whitespace-nowrap text-[13px]"
                  >
                    {t('premiumUpgradeButton')}
                  </Button>
                </div>
              )}
            </SectionCard>
          )}

          {activeSection === 'appearance' && (
            <SectionCard
              title={t('appearanceTitle')}
              description={t('appearanceDescription')}
            >
              <FormGroup>
                <Label htmlFor="applicationLanguage" required>
                  {t('applicationLanguageLabel')}
                </Label>
                <Controller
                  name="applicationLanguage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={localizedLanguageOptions}
                      onValueChange={field.onChange}
                      value={field.value}
                      error={!!errors.applicationLanguage}
                      placeholder={t('appLanguagePlaceholder')}
                      ariaLabel={t('applicationLanguageLabel')}
                    />
                  )}
                />
              </FormGroup>

              <SettingRow
                label={t('themeLabel')}
                description={t('themeDescription')}
              >
                <Controller
                  name="theme"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={themeOptions}
                      onValueChange={field.onChange}
                      value={field.value}
                      ariaLabel={t('themeLabel')}
                      className="w-[170px]"
                    />
                  )}
                />
              </SettingRow>

              <SettingRow
                label={t('timeFormatLabel')}
                description={t('timeFormatDescription')}
              >
                <Controller
                  name="timeFormat"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={timeFormatOptions}
                      onValueChange={field.onChange}
                      value={field.value}
                      ariaLabel={t('timeFormatLabel')}
                      className="w-[170px]"
                    />
                  )}
                />
              </SettingRow>

              <SettingRow
                label={t('languageDisplayLabel')}
                description={t('languageDisplayDescription')}
              >
                <Controller
                  name="languageDisplay"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={languageDisplayOptions}
                      onValueChange={field.onChange}
                      value={field.value}
                      ariaLabel={t('languageDisplayLabel')}
                      className="w-[170px]"
                    />
                  )}
                />
              </SettingRow>
            </SectionCard>
          )}

          {activeSection === 'privacy' && (
            <SectionCard
              title={t('privacyTitle')}
              description={t('privacyDescription')}
            >
              <div className="flex flex-col gap-2.5">
                <SettingRow
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
                </SettingRow>

                <SettingRow
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
                </SettingRow>

                <SettingRow
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
                </SettingRow>

                {premium ? (
                  <SettingRow
                    label={t('hideProfileVisitsLabel')}
                    description={t('hideProfileVisitsDescriptionPremium')}
                  >
                    <Controller
                      name="hideProfileVisits"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </SettingRow>
                ) : (
                  <div className="flex items-center justify-between gap-6 rounded-xl bg-background-darker px-4 py-3.5 transition-colors hover:bg-background-main">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-[15px] text-foreground">
                        {t('hideProfileVisitsLabel')}
                        <span className="inline-flex items-center rounded-full bg-overlay px-[9px] py-0.5 font-bold text-[10.5px] text-soft uppercase tracking-[0.05em]">
                          {t('premiumTag')}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-subtle">
                        {t('hideProfileVisitsDescriptionFree')}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Toggle
                        checked={false}
                        onCheckedChange={() => jumpToSection('premium')}
                        aria-label={t('hideProfileVisitsLabel')}
                      />
                    </div>
                  </div>
                )}

                <SettingRow
                  label={t('productAnalyticsLabel')}
                  description={t('productAnalyticsDescription')}
                >
                  <Controller
                    name="productAnalytics"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label={t('productAnalyticsLabel')}
                      />
                    )}
                  />
                </SettingRow>
              </div>
              {blockedUsers}
            </SectionCard>
          )}

          {activeSection === 'notifications' && (
            <SectionCard
              title={t('notificationsTitle')}
              description={t('notificationsDescription')}
            >
              <div className="flex flex-col gap-2.5">
                <SettingRow
                  label={t('pushNotificationsLabel')}
                  description={t('pushNotificationsDescription')}
                >
                  <Controller
                    name="pushNotifications"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          void handlePushToggle(checked);
                        }}
                        disabled={pushBusy || pushStatus === 'unsupported'}
                        aria-label={t('pushNotificationsLabel')}
                      />
                    )}
                  />
                </SettingRow>

                {pushStatus !== 'idle' ? (
                  <output className="text-[13px] text-muted">
                    {t(
                      pushStatus === 'denied'
                        ? 'pushDenied'
                        : pushStatus === 'unsupported'
                          ? 'pushUnsupported'
                          : 'pushError',
                    )}
                  </output>
                ) : null}

                <SettingRow
                  label={t('profileInteractionAlertLabel')}
                  description={
                    premium
                      ? t('profileInteractionAlertDescriptionPremium')
                      : t('profileInteractionAlertDescription')
                  }
                >
                  <Controller
                    name="profileInteractionAlert"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label={t('profileInteractionAlertLabel')}
                      />
                    )}
                  />
                </SettingRow>

                {premium ? (
                  <SettingRow
                    label={t('profileViewAlertLabel')}
                    description={t('profileViewAlertDescriptionPremium')}
                  >
                    <Controller
                      name="profileViewAlert"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={t('profileViewAlertLabel')}
                        />
                      )}
                    />
                  </SettingRow>
                ) : (
                  <div className="flex items-center justify-between gap-6 rounded-xl bg-background-darker px-4 py-3.5 transition-colors hover:bg-background-main">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-[15px] text-foreground">
                        {t('profileViewAlertLabel')}
                        <span className="inline-flex items-center rounded-full bg-overlay px-[9px] py-0.5 font-bold text-[10.5px] text-soft uppercase tracking-[0.05em]">
                          {t('premiumTag')}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-subtle">
                        {t('profileViewAlertDescriptionFree')}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Toggle
                        checked={false}
                        onCheckedChange={() => jumpToSection('premium')}
                        aria-label={t('profileViewAlertLabel')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <div className="sticky bottom-[calc(var(--dock-space,0px)+20px)] z-[6] flex flex-col gap-3 rounded-[18px] border border-line bg-background-darker px-5 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {saveStatus === 'error' ? (
              <span className="text-[13px] text-danger">{t('saveError')}</span>
            ) : billingStatus === 'error' ? (
              <span className="text-[13px] text-danger">
                {t('billingError')}
              </span>
            ) : (
              <span
                className={`text-[13px] ${isDirty ? 'text-primary-light' : 'text-muted'}`}
              >
                {isDirty ? t('unsavedChanges') : t('allChangesSaved')}
              </span>
            )}
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
                {isSubmitting ? t('saving') : t('saveSettings')}
              </Button>
            </div>
          </div>
        </div>
      </fieldset>
    </form>
  );
};
