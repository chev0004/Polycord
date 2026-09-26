'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Controller,
  type PathValue,
  type UseFormReturn,
} from 'react-hook-form';
import {
  MdChevronLeft,
  MdDarkMode,
  MdDeleteOutline,
  MdDownload,
  MdLockOutline,
  MdLogout,
  MdMailOutline,
  MdNotificationsNone,
  MdOutlineSchedule,
  MdOutlineWorkspacePremium,
  MdSync,
  MdTextFields,
  MdTranslate,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { FieldError, Label, TextInput, Toggle } from '@/components/Form';
import { ActionSheet, Sheet, SheetLabel, SheetRow } from '@/components/Sheet';
import { ToastStack } from '@/components/Toast';
import { signInHref } from '@/features/Navigation/signIn';
import { useToastStack } from '@/hooks/useToast';
import { CompareTable } from './CompareTable';
import { type SettingsFormValues, settingsSchema } from './schema';

export const SettingsGroup = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-3xl bg-background-dark">
    {children}
  </div>
);

export const SettingsToggleRow = ({
  label,
  description,
  children,
}: {
  label: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) => (
  <div className="relative flex min-h-14 items-center gap-3.5 px-4 py-2.5 before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-line first:before:hidden">
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-center gap-2 font-semibold text-[15px]">
        {label}
      </span>
      <span className="text-[13px] text-subtle leading-snug">
        {description}
      </span>
    </div>
    {children}
  </div>
);

export const SettingsPushPage = ({
  title,
  backLabel,
  animate,
  onBack,
  children,
}: {
  title: string;
  backLabel: string;
  animate: boolean;
  onBack: () => void;
  children: ReactNode;
}) => (
  <div
    className={
      animate
        ? 'motion-safe:animate-[pushIn_0.38s_cubic-bezier(0.16,1,0.3,1)]'
        : undefined
    }
  >
    <div className="relative flex min-h-12 items-center px-2">
      <button
        type="button"
        onClick={onBack}
        className="flex h-11 items-center pr-2.5 font-semibold text-[15px] text-primary hover:text-primary-light focus-visible:text-primary-light"
      >
        <MdChevronLeft size={26} aria-hidden />
        {backLabel}
      </button>
      <h1 className="-translate-x-1/2 pointer-events-none absolute left-1/2 font-bold text-base">
        {title}
      </h1>
    </div>
    <div className="flex flex-col gap-3 px-4 pt-2 pb-8">{children}</div>
  </div>
);

type MobilePage = 'privacy' | 'notifications' | 'premium';

const mobilePages: string[] = ['privacy', 'notifications', 'premium'];

type ChoiceField =
  | 'applicationLanguage'
  | 'theme'
  | 'timeFormat'
  | 'languageDisplay';

type SaveField = ChoiceField | ToggleField | 'email';

type ToggleField =
  | 'isPublic'
  | 'allowAnonymousCopy'
  | 'displayTimezone'
  | 'hideProfileVisits'
  | 'productAnalytics'
  | 'profileInteractionAlert'
  | 'profileViewAlert';

type MobileSettingsProps = {
  form: UseFormReturn<SettingsFormValues>;
  onSave: (data: SettingsFormValues) => Promise<boolean>;
  sessionExpired: boolean;
  ready: boolean;
  premium: boolean;
  userAvatarUrl?: string;
  userDisplayName: string;
  subscriptionRenewsAt?: string;
  subscriptionCancelAtPeriodEnd: boolean;
  options: Record<ChoiceField, { label: string; value: string }[]>;
  blockedUsers?: ReactNode;
  pushStatus: 'idle' | 'denied' | 'unsupported' | 'error';
  pushBusy: boolean;
  onPushToggle: (checked: boolean) => Promise<void>;
  billingStatus: 'idle' | 'loading' | 'error';
  onManageSubscription: () => Promise<void>;
  exportStatus: 'idle' | 'loading' | 'success' | 'error';
  onExportData: () => Promise<void>;
  onUpdateDiscordConnection: () => void;
  deleteStatus: 'idle' | 'confirming' | 'loading' | 'error' | 'billing-error';
  deleteConfirmation: string;
  onDeleteConfirmationChange: (value: string) => void;
  onDeleteStart: () => void;
  onDeleteReset: () => void;
  onDeleteAccount: () => Promise<void>;
};

export const MobileSettings = ({
  form,
  onSave,
  sessionExpired,
  ready,
  premium,
  userAvatarUrl,
  userDisplayName,
  subscriptionRenewsAt,
  subscriptionCancelAtPeriodEnd,
  options,
  blockedUsers,
  pushStatus,
  pushBusy,
  onPushToggle,
  billingStatus,
  onManageSubscription,
  exportStatus,
  onExportData,
  onUpdateDiscordConnection,
  deleteStatus,
  deleteConfirmation,
  onDeleteConfirmationChange,
  onDeleteStart,
  onDeleteReset,
  onDeleteAccount,
}: MobileSettingsProps) => {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const { control, watch, getValues, setValue, resetField } = form;
  const { toasts, addToast, dismissToast } = useToastStack();
  const [mobilePage, setMobilePage] = useState<MobilePage | null>(null);
  const [sheet, setSheet] = useState<ChoiceField | 'email' | 'delete' | null>(
    null,
  );
  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pagePushed = useRef(false);
  const [animatePage, setAnimatePage] = useState(false);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.slice(1);
      setMobilePage(mobilePages.includes(hash) ? (hash as MobilePage) : null);
      setAnimatePage(false);
    };
    syncHash();
    window.addEventListener('popstate', syncHash);
    return () => window.removeEventListener('popstate', syncHash);
  }, []);

  const openPage = (page: MobilePage) => {
    window.history.pushState(null, '', `#${page}`);
    pagePushed.current = true;
    setMobilePage(page);
    setAnimatePage(true);
    window.scrollTo({ top: 0 });
  };

  const closePage = () => {
    if (pagePushed.current) {
      pagePushed.current = false;
      window.history.back();
      return;
    }
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    setMobilePage(null);
  };

  const openEmailSheet = () => {
    setEmailDraft(getValues('email'));
    setEmailError(null);
    setSheet('email');
  };

  const save = async <K extends SaveField>(
    name: K,
    value: PathValue<SettingsFormValues, K>,
  ) => {
    setValue(name, value, { shouldDirty: true });
    const parsed = settingsSchema.safeParse(getValues());
    if (!parsed.success) {
      resetField(name);
      openEmailSheet();
      setEmailError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const saved = await onSave(parsed.data);
    setSaving(false);
    if (!saved) resetField(name);
    addToast({
      title: t(saved ? 'savedTitle' : 'saveFailedTitle'),
      description: t(saved ? 'savedDescription' : 'saveError'),
      duration: saved ? 2500 : 4000,
    });
  };

  const applyEmail = () => {
    const result = settingsSchema.shape.email.safeParse(emailDraft);
    if (!result.success) {
      setEmailError(result.error.issues[0].message);
      return;
    }
    setSheet(null);
    void save('email', emailDraft);
  };

  const values = watch();

  const choices: Record<
    ChoiceField,
    {
      label: string;
      icon: typeof MdTranslate;
      options: { label: string; value: string }[];
    }
  > = {
    applicationLanguage: {
      label: t('applicationLanguageLabel'),
      icon: MdTranslate,
      options: options.applicationLanguage,
    },
    theme: { label: t('themeLabel'), icon: MdDarkMode, options: options.theme },
    timeFormat: {
      label: t('timeFormatLabel'),
      icon: MdOutlineSchedule,
      options: options.timeFormat,
    },
    languageDisplay: {
      label: t('languageDisplayLabel'),
      icon: MdTextFields,
      options: options.languageDisplay,
    },
  };

  const choiceRow = (field: ChoiceField) => (
    <SheetRow
      key={field}
      icon={choices[field].icon}
      label={choices[field].label}
      value={
        choices[field].options.find((option) => option.value === values[field])
          ?.label
      }
      chevron
      onClick={() => setSheet(field)}
    />
  );

  const toggleRow = (name: ToggleField, label: string, description: string) => (
    <SettingsToggleRow key={name} label={label} description={description}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Toggle
            checked={field.value}
            onCheckedChange={(checked) => void save(name, checked)}
            aria-label={label}
          />
        )}
      />
    </SettingsToggleRow>
  );

  const lockedRow = (label: string, description: string) => (
    <SettingsToggleRow
      label={
        <>
          {label}
          <span className="rounded bg-primary-darker px-1.5 py-0.5 font-bold text-[10px] text-primary-light uppercase tracking-[0.04em]">
            {t('premiumTag')}
          </span>
        </>
      }
      description={description}
    >
      <Toggle
        checked={false}
        onCheckedChange={() => openPage('premium')}
        aria-label={label}
      />
    </SettingsToggleRow>
  );

  const notificationsOn = [
    values.pushNotifications,
    values.profileInteractionAlert,
    premium && values.profileViewAlert,
  ].filter(Boolean).length;

  const closeDeleteSheet = () => {
    if (deleteStatus === 'loading') return;
    setSheet(null);
    onDeleteReset();
  };

  return (
    <div className="mx-auto w-full max-w-xl overflow-x-clip pb-24 font-figtree">
      {sessionExpired ? (
        <p
          role="alert"
          className="mx-4 mb-3 rounded-xl bg-background-dark px-4 py-3 text-sm"
        >
          <a
            className="font-semibold text-primary-light underline focus-visible:text-primary-lighter"
            href={signInHref(locale)}
          >
            {t('sessionExpired')}
          </a>
        </p>
      ) : null}
      <fieldset disabled={!ready || saving} className="min-w-0">
        {mobilePage === 'privacy' ? (
          <SettingsPushPage
            title={t('privacyTitle')}
            backLabel={t('settingsTitle')}
            animate={animatePage}
            onBack={closePage}
          >
            <p className="px-1 text-[13px] text-subtle leading-snug">
              {t('privacyInstantDescription')}
            </p>
            <SettingsGroup>
              {toggleRow(
                'isPublic',
                t('makeProfilePublicLabel'),
                t('makeProfilePublicDescription'),
              )}
              {toggleRow(
                'allowAnonymousCopy',
                t('allowAnonymousCopyingLabel'),
                t('allowAnonymousCopyingDescription'),
              )}
              {toggleRow(
                'displayTimezone',
                t('displayTimezoneLabel'),
                t('displayTimezoneDescription'),
              )}
              {premium
                ? toggleRow(
                    'hideProfileVisits',
                    t('hideProfileVisitsLabel'),
                    t('hideProfileVisitsDescriptionPremium'),
                  )
                : lockedRow(
                    t('hideProfileVisitsLabel'),
                    t('hideProfileVisitsDescriptionFree'),
                  )}
              {toggleRow(
                'productAnalytics',
                t('productAnalyticsLabel'),
                t('productAnalyticsDescription'),
              )}
            </SettingsGroup>
            {blockedUsers}
          </SettingsPushPage>
        ) : mobilePage === 'notifications' ? (
          <SettingsPushPage
            title={t('notificationsTitle')}
            backLabel={t('settingsTitle')}
            animate={animatePage}
            onBack={closePage}
          >
            <p className="px-1 text-[13px] text-subtle leading-snug">
              {t('notificationsDescription')}
            </p>
            <SettingsGroup>
              <SettingsToggleRow
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
                        void onPushToggle(checked);
                      }}
                      disabled={pushBusy || pushStatus === 'unsupported'}
                      aria-label={t('pushNotificationsLabel')}
                    />
                  )}
                />
              </SettingsToggleRow>
              {toggleRow(
                'profileInteractionAlert',
                t('profileInteractionAlertLabel'),
                premium
                  ? t('profileInteractionAlertDescriptionPremium')
                  : t('profileInteractionAlertDescription'),
              )}
              {premium
                ? toggleRow(
                    'profileViewAlert',
                    t('profileViewAlertLabel'),
                    t('profileViewAlertDescriptionPremium'),
                  )
                : lockedRow(
                    t('profileViewAlertLabel'),
                    t('profileViewAlertDescriptionFree'),
                  )}
            </SettingsGroup>
            {pushStatus !== 'idle' ? (
              <output className="px-1 text-[13px] text-muted">
                {t(
                  pushStatus === 'denied'
                    ? 'pushPermissionDenied'
                    : pushStatus === 'unsupported'
                      ? 'pushUnsupported'
                      : 'pushError',
                )}
              </output>
            ) : null}
          </SettingsPushPage>
        ) : mobilePage === 'premium' ? (
          <SettingsPushPage
            title={t('premiumTitle')}
            backLabel={t('settingsTitle')}
            animate={animatePage}
            onBack={closePage}
          >
            <div className="flex flex-col gap-1.5 rounded-3xl bg-background-dark px-5 py-[22px]">
              <span className="self-start rounded bg-primary-darker px-1.5 py-0.5 font-bold text-[10px] text-primary-light uppercase tracking-[0.04em]">
                {premium ? t('premiumYourPlan') : t('premiumTag')}
              </span>
              <p>
                <span className="font-black text-[34px] tracking-[-0.02em]">
                  {t('premiumPriceAmount')}
                </span>{' '}
                <span className="font-medium text-muted text-sm">
                  {t('premiumPerMonth')}
                </span>
              </p>
              <p className="text-[13px] text-subtle leading-snug">
                {premium
                  ? t('premiumTabDescriptionPremium')
                  : t('premiumTabDescriptionFree')}
              </p>
              {premium && subscriptionRenewsAt ? (
                <p className="text-[13px] text-subtle">
                  {t(
                    subscriptionCancelAtPeriodEnd
                      ? 'billingEnds'
                      : 'billingRenews',
                    {
                      date: new Date(subscriptionRenewsAt).toLocaleDateString(
                        locale,
                      ),
                    },
                  )}
                </p>
              ) : null}
            </div>
            <CompareTable />
            <Button
              variant={premium ? 'outline' : 'primary'}
              weight="semibold"
              onClick={onManageSubscription}
              disabled={billingStatus === 'loading'}
              className="h-[50px] rounded-full text-[15px]"
            >
              {premium ? t('manageBillingButton') : t('premiumUpgradeButton')}
            </Button>
            <p className="text-center text-subtle text-xs">
              {premium ? t('premiumPlanNote') : t('premiumUpgradeNote')}
            </p>
            {billingStatus === 'error' ? (
              <p role="alert" className="text-center text-[13px] text-danger">
                {t('billingError')}
              </p>
            ) : null}
          </SettingsPushPage>
        ) : (
          <div className="flex flex-col px-4">
            <h1 className="flex min-h-[52px] items-center pt-1 pb-2 font-bold text-[28px] leading-tight tracking-[-0.01em]">
              {t('settingsTitle')}
            </h1>
            <div className="flex items-center gap-3.5 rounded-3xl bg-background-dark p-4">
              <Avatar avatarUrl={userAvatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[17px]">
                  {userDisplayName}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {values.email}
                </p>
              </div>
              <span
                className={`flex h-[26px] flex-shrink-0 items-center rounded-full px-2.5 font-semibold text-xs ${
                  premium
                    ? 'bg-primary-darker text-primary-light'
                    : 'bg-overlay text-muted'
                }`}
              >
                {premium ? t('premiumTag') : t('compareFreeHeader')}
              </span>
            </div>

            <SheetLabel>{t('accountTitle')}</SheetLabel>
            <SettingsGroup>
              <SheetRow
                icon={MdMailOutline}
                label={t('emailLabel')}
                value={values.email}
                chevron
                onClick={openEmailSheet}
              />
              <SheetRow
                icon={MdSync}
                label={t('updateDiscordConnectionLabel')}
                description={t('updateDiscordConnectionDescription')}
                onClick={onUpdateDiscordConnection}
              />
              <SheetRow
                icon={MdOutlineWorkspacePremium}
                label={t('premiumTitle')}
                value={premium ? t('premiumActive') : t('premiumFreePlan')}
                valueActive={premium}
                chevron
                onClick={() => openPage('premium')}
              />
              <SheetRow
                icon={MdDownload}
                label={t('exportDataLabel')}
                description={
                  exportStatus === 'loading'
                    ? t('exportingData')
                    : exportStatus === 'success'
                      ? t('exportDataSuccess')
                      : exportStatus === 'error'
                        ? t('exportDataError')
                        : undefined
                }
                disabled={exportStatus === 'loading'}
                onClick={onExportData}
              />
            </SettingsGroup>

            <SheetLabel>{t('appearanceTitle')}</SheetLabel>
            <SettingsGroup>
              {choiceRow('applicationLanguage')}
              {choiceRow('theme')}
              {choiceRow('timeFormat')}
              {choiceRow('languageDisplay')}
            </SettingsGroup>

            <SheetLabel>{t('privacyAlertsTitle')}</SheetLabel>
            <SettingsGroup>
              <SheetRow
                icon={MdLockOutline}
                label={t('privacyTitle')}
                value={
                  values.isPublic ? t('privacyPublic') : t('privacyUnlisted')
                }
                chevron
                onClick={() => openPage('privacy')}
              />
              <SheetRow
                icon={MdNotificationsNone}
                label={t('notificationsTitle')}
                value={t('notificationsOn', { count: notificationsOn })}
                chevron
                onClick={() => openPage('notifications')}
              />
            </SettingsGroup>

            <div className="mt-6">
              <SettingsGroup>
                <SheetRow
                  icon={MdDeleteOutline}
                  label={t('deleteAccountLabel')}
                  danger
                  onClick={() => {
                    onDeleteStart();
                    setSheet('delete');
                  }}
                />
                <SheetRow
                  icon={MdLogout}
                  label={t('logout')}
                  danger
                  onClick={() =>
                    window.location.assign(`/api/auth/logout?locale=${locale}`)
                  }
                />
              </SettingsGroup>
            </div>
          </div>
        )}
      </fieldset>

      <Sheet
        open={sheet === 'email'}
        onOpenChange={(open) => setSheet(open ? 'email' : null)}
        title={t('emailLabel')}
        footer={
          <Button
            weight="semibold"
            onClick={applyEmail}
            className="h-[50px] flex-1 rounded-full text-[15px]"
          >
            {t('save')}
          </Button>
        }
      >
        <TextInput
          id="email-sheet"
          type="email"
          inputMode="email"
          aria-label={t('emailLabel')}
          value={emailDraft}
          placeholder={t('emailPlaceholder')}
          error={Boolean(emailError)}
          onChange={(event) => {
            setEmailDraft(event.target.value);
            setEmailError(null);
          }}
        />
        {emailError ? (
          <FieldError id="email-sheet-error">{t(emailError)}</FieldError>
        ) : (
          <p className="mt-2 text-[13px] text-subtle leading-snug">
            {t('emailDescription')}
          </p>
        )}
      </Sheet>

      {(Object.keys(choices) as ChoiceField[]).map((field) => (
        <ActionSheet
          key={field}
          open={sheet === field}
          onOpenChange={(open) => setSheet(open ? field : null)}
          title={choices[field].label}
          radio
          items={choices[field].options.map((option) => ({
            key: option.value,
            label: option.label,
            selected: values[field] === option.value,
            onSelect: () => void save(field, option.value as never),
          }))}
        />
      ))}

      <Sheet
        open={sheet === 'delete'}
        onOpenChange={(open) => {
          if (!open) closeDeleteSheet();
        }}
        title={t('deleteAccountLabel')}
        footer={
          <>
            <Button
              variant="outline"
              weight="semibold"
              onClick={closeDeleteSheet}
              disabled={deleteStatus === 'loading'}
              className="h-[50px] flex-1 rounded-full text-[15px]"
            >
              {t('cancelDeleteAccount')}
            </Button>
            <Button
              variant="outline"
              weight="semibold"
              onClick={onDeleteAccount}
              disabled={
                deleteStatus === 'loading' || deleteConfirmation !== 'DELETE'
              }
              className="h-[50px] flex-1 rounded-full border-red-500/60 text-[15px] text-danger hover:bg-danger-surface"
            >
              {deleteStatus === 'loading'
                ? t('deletingAccount')
                : t('deleteAccountButton')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-muted leading-snug">
            {t('deleteAccountDescription')}
          </p>
          <Label htmlFor="deleteAccountConfirmationMobile">
            {t('deleteAccountConfirmationLabel')}
          </Label>
          <TextInput
            id="deleteAccountConfirmationMobile"
            value={deleteConfirmation}
            onChange={(event) => onDeleteConfirmationChange(event.target.value)}
            placeholder={t('deleteAccountConfirmationPlaceholder')}
            disabled={deleteStatus === 'loading'}
          />
          <p className="text-[12px] text-subtle leading-relaxed">
            {t('deleteAccountRetentionNote')}
          </p>
          {deleteStatus === 'error' || deleteStatus === 'billing-error' ? (
            <p role="alert" className="text-danger text-xs">
              {t(
                deleteStatus === 'billing-error'
                  ? 'deleteAccountBillingError'
                  : 'deleteAccountError',
              )}
            </p>
          ) : null}
        </div>
      </Sheet>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
