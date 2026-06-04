'use client';

import {
  type SettingsFormValues,
  SettingsPage,
} from '@/features/Settings/SettingsPage';

const defaultSettings: SettingsFormValues = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  activityStatus: true,
  pushNotifications: true,
  matchAlert: true,
  profileInteractionAlert: true,
  theme: 'dark',
  applicationLanguage: 'en',
  timeFormat: '24hr',
  email: 'xhev@polycord.app',
};

export const SettingsRouteClient = () => (
  <SettingsPage
    defaultValues={defaultSettings}
    onSubmit={(data) => console.log('Settings route', data)}
    onUpdateDiscordConnection={() => console.log('Update Discord connection')}
    onManageSubscription={() => console.log('Manage subscription')}
  />
);
