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
  locale: string;
  userAvatarUrl?: string;
  userDisplayName: string;
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
  locale,
  userAvatarUrl,
  userDisplayName,
}: SettingsRouteClientProps) => {
  const router = useRouteProgressRouter();
  const defaultSettings: SettingsFormValues = {
    isPublic: initialPrivacySettings?.isPublic ?? true,
    allowAnonymousCopy: initialPrivacySettings?.allowAnonymousCopy ?? true,
    displayTimezone: initialPrivacySettings?.displayTimezone ?? true,
    activityStatus: true,
    pushNotifications: true,
    matchAlert: true,
    profileInteractionAlert: true,
    profileViewAlert: false,
    theme: 'dark',
    applicationLanguage: locale,
    timeFormat: '24hr',
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
      onSubmit={() => undefined}
      onUpdateDiscordConnection={() =>
        window.location.assign(`/api/auth/discord?locale=${locale}`)
      }
      onManageSubscription={() => undefined}
    />
  );
};
