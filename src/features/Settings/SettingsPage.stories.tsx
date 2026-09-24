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
  profileViewAlert: true,
  hideProfileVisits: false,
  productAnalytics: true,
  theme: 'dark',
  applicationLanguage: 'en',
  timeFormat: '24hr',
  languageDisplay: 'long',
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

export const RestoredDraft: Story = {
  args: { userId: 'settings-draft-story' },
  loaders: [
    async () => {
      sessionStorage.setItem(
        'polycord:settings:settings-draft-story',
        JSON.stringify({ email: 'unfinished-email' }),
      );
      return {};
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText('Email Address')).toHaveValue(
        'unfinished-email',
      ),
    );
    await expect(
      canvas.getByText(
        'Your unsaved draft has been restored. Review it, then Save or Discard.',
      ),
    ).toBeInTheDocument();
  },
};

export const AccountBillingError: Story = {
  args: { onDeleteAccount: async () => 'billing-error' as const },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.click(
      canvas.getByRole('button', { name: 'Delete account' }),
    );
    setFieldValue(
      canvas.getByPlaceholderText('DELETE') as HTMLInputElement,
      'DELETE',
    );
    const confirm = canvas.getByRole('button', {
      name: 'Delete account',
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    await fireEvent.click(confirm);
    await waitFor(() =>
      expect(canvas.getByRole('alert')).toHaveTextContent(
        'subscription cancellation failed',
      ),
    );
  },
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

export const PrivacyTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(canvas.getByRole('button', { name: 'Privacy' }));

    await waitFor(() =>
      expect(canvas.getByText('Product analytics')).toBeInTheDocument(),
    );
    await expect(
      canvas.getByText(
        'Help improve Polycord by sharing anonymous, non-personal usage events.',
      ),
    ).toBeInTheDocument();
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

export const SaveError: Story = {
  args: {
    onSubmit: fn(async () => {
      throw new Error('save failed');
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const email = canvas.getByPlaceholderText(
      'Enter your email for recovery',
    ) as HTMLInputElement;
    setFieldValue(email, 'error.path@polycord.app');

    await waitFor(
      () =>
        expect(
          canvas.getByText('You have unsaved changes'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );

    fireEvent.click(canvas.getByRole('button', { name: 'Save Settings' }));

    await waitFor(
      () =>
        expect(
          canvas.getByText('Could not save your settings. Please try again.'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};

export const PremiumTabFree: Story = {
  args: { premium: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(canvas.getByRole('button', { name: 'Premium' }));

    await waitFor(() =>
      expect(canvas.getByText('Bump cooldown')).toBeInTheDocument(),
    );
    expect(canvas.getByText('Every 1 h 30 m')).toBeInTheDocument();
    expect(canvas.getByText('See who viewed you')).toBeInTheDocument();
    expect(canvas.getAllByText('No')).toHaveLength(2);

    expect(
      canvas.getByText('$2.99 / month · cancel anytime'),
    ).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: 'Upgrade' })).toBeInTheDocument();
    expect(
      canvas.queryByRole('button', { name: 'Manage billing' }),
    ).not.toBeInTheDocument();
  },
};

export const PremiumTabPremium: Story = {
  args: { premium: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(canvas.getByRole('button', { name: 'Premium' }));

    await waitFor(() =>
      expect(
        canvas.getByText('Your plan: everything below is included.'),
      ).toBeInTheDocument(),
    );
    expect(canvas.getByText('$2.99')).toBeInTheDocument();
    expect(canvas.getByText('Bump cooldown')).toBeInTheDocument();
    expect(
      canvas.getByRole('button', { name: 'Manage billing' }),
    ).toBeInTheDocument();
    expect(
      canvas.queryByRole('button', { name: 'Upgrade' }),
    ).not.toBeInTheDocument();
  },
};

export const GatedProfileViewAlert: Story = {
  args: { premium: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(canvas.getByRole('button', { name: 'Notifications' }));

    await waitFor(() =>
      expect(canvas.getByText('Profile View Alert')).toBeInTheDocument(),
    );
    expect(canvas.getAllByText('Premium')).toHaveLength(2);

    fireEvent.click(canvas.getByRole('switch', { name: 'Profile View Alert' }));

    await waitFor(() =>
      expect(canvas.getByText('Bump cooldown')).toBeInTheDocument(),
    );
    expect(
      canvas.getByText(
        'Everything in Free, plus more room to learn and be found.',
      ),
    ).toBeInTheDocument();
  },
};
