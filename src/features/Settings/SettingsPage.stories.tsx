import type { Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, fn, waitFor, within } from '@storybook/test';
import { type SettingsFormValues, SettingsPage } from './SettingsPage';

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

const setFieldValue = (field: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

const meta: Meta<typeof SettingsPage> = {
  title: 'Features/Settings/SettingsPage',
  component: SettingsPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background-main">
        <Story />
      </div>
    ),
  ],
  args: {
    defaultValues: defaultSettings,
    userDisplayName: 'Kenji Ito',
    onDeleteAccount: fn(),
    onExportData: fn(),
    onSubmit: fn(),
    onUpdateDiscordConnection: fn(),
    onManageSubscription: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SettingsPage>;

export const Default: Story = {
  args: {},
};

export const SwitchTabs: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByPlaceholderText('Enter your email for recovery'),
    ).toBeInTheDocument();

    fireEvent.click(canvas.getByRole('button', { name: 'Privacy' }));

    await waitFor(() =>
      expect(canvas.getByText('Make Profile Public')).toBeInTheDocument(),
    );
    expect(
      canvas.queryByPlaceholderText('Enter your email for recovery'),
    ).not.toBeInTheDocument();

    fireEvent.click(canvas.getByRole('button', { name: 'Notifications' }));

    await waitFor(() =>
      expect(canvas.getByText('New Match Alert')).toBeInTheDocument(),
    );
    expect(canvas.queryByText('Make Profile Public')).not.toBeInTheDocument();
  },
};

export const EmailValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const email = canvas.getByPlaceholderText(
      'Enter your email for recovery',
    ) as HTMLInputElement;
    setFieldValue(email, 'not-an-email');
    await waitFor(() => expect(email).toHaveValue('not-an-email'));

    fireEvent.click(canvas.getByRole('button', { name: 'Privacy' }));
    await waitFor(() =>
      expect(canvas.getByText('Make Profile Public')).toBeInTheDocument(),
    );

    fireEvent.click(canvas.getByRole('button', { name: 'Save Settings' }));

    await waitFor(
      () =>
        expect(
          canvas.getByText('Please enter a valid email address.'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    await expect(
      canvas.getByPlaceholderText('Enter your email for recovery'),
    ).toBeInTheDocument();
  },
};

export const SaveFlow: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('All changes saved')).toBeInTheDocument();
    const saveButton = canvas.getByRole('button', { name: 'Save Settings' });
    await expect(saveButton).toBeDisabled();

    const email = canvas.getByPlaceholderText(
      'Enter your email for recovery',
    ) as HTMLInputElement;
    setFieldValue(email, 'kenji.ito@polycord.app');

    await waitFor(
      () =>
        expect(
          canvas.getByText('You have unsaved changes'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    await expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    await waitFor(
      () => expect(canvas.getByText('All changes saved')).toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};
