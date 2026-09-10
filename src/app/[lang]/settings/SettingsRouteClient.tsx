'use client';

import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import {
  type SettingsFormValues,
  SettingsPage,
} from '@/features/Settings/SettingsPage';

type SettingsRouteClientProps = {
  defaultEmail: string;
  initialPrivacySettings?: Pick<
    SettingsFormValues,
    'allowAnonymousCopy' | 'displayTimezone' | 'isPublic'
  >;
  initialSettings?: Pick<
    SettingsFormValues,
    | 'activityStatus'
    | 'applicationLanguage'
    | 'matchAlert'
    | 'profileInteractionAlert'
    | 'profileViewAlert'
    | 'productAnalytics'
    | 'pushNotifications'
    | 'theme'
    | 'timeFormat'
  >;
  locale: string;
  premium?: boolean;
  subscriptionRenewsAt?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  userAvatarUrl?: string;
  userDisplayName: string;
};

const saveSettings = async (data: SettingsFormValues) => {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Settings save failed');
  }
};

const downloadAccountData = async () => {
  const response = await fetch('/api/account/export');

  if (!response.ok) {
    throw new Error('Account export failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'polycord-account-export.json';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const SettingsRouteClient = ({
  defaultEmail,
  initialPrivacySettings,
  initialSettings,
  locale,
  premium = false,
  subscriptionRenewsAt,
  subscriptionCancelAtPeriodEnd,
  userAvatarUrl,
  userDisplayName,
}: SettingsRouteClientProps) => {
  const router = useRouteProgressRouter();
  const defaultSettings: SettingsFormValues = {
    isPublic: initialPrivacySettings?.isPublic ?? true,
    allowAnonymousCopy: initialPrivacySettings?.allowAnonymousCopy ?? true,
    displayTimezone: initialPrivacySettings?.displayTimezone ?? true,
    activityStatus: initialSettings?.activityStatus ?? true,
    pushNotifications: initialSettings?.pushNotifications ?? true,
    matchAlert: initialSettings?.matchAlert ?? true,
    profileInteractionAlert: initialSettings?.profileInteractionAlert ?? true,
    profileViewAlert: initialSettings?.profileViewAlert ?? false,
    productAnalytics: initialSettings?.productAnalytics ?? true,
    theme: initialSettings?.theme ?? 'dark',
    applicationLanguage: initialSettings?.applicationLanguage ?? locale,
    timeFormat: initialSettings?.timeFormat ?? '24hr',
    email: defaultEmail,
  };

  return (
    <SettingsPage
      defaultValues={defaultSettings}
      userAvatarUrl={userAvatarUrl}
      userDisplayName={userDisplayName}
      onDeleteAccount={async () => {
        const response = await fetch('/api/account', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'DELETE' }),
        });

        if (!response.ok) {
          throw new Error('Account delete failed');
        }

        router.push(`/${locale}`);
        router.refresh();
      }}
      onExportData={downloadAccountData}
      onSubmit={saveSettings}
      onUpdateDiscordConnection={() =>
        window.location.assign(`/api/auth/discord?locale=${locale}`)
      }
      onManageSubscription={async () => {
        const response = await fetch('/api/billing/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale }),
        });

        if (!response.ok) {
          throw new Error('Billing session failed');
        }

        const { url } = (await response.json()) as { url: string };
        window.location.assign(url);
      }}
      premium={premium}
      subscriptionRenewsAt={subscriptionRenewsAt}
      subscriptionCancelAtPeriodEnd={subscriptionCancelAtPeriodEnd}
    />
  );
};
