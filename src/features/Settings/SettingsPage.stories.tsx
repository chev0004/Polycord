import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { SessionExpiredError } from '@/lib/formErrors';
import { BlockedUsers } from './BlockedUsers';
import { type SettingsFormValues, SettingsPage } from './SettingsPage';

const defaultSettings: SettingsFormValues = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  pushNotifications: true,
  profileInteractionAlert: true,
  profileViewAlert: true,
  hideProfileVisits: false,
  productAnalytics: true,
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
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <div className="min-h-screen bg-background-main">
          <Story />
        </div>
      </RouteProgressProvider>
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
      canvas.getByPlaceholderText('Enter your email address'),
    ).toBeInTheDocument();

    fireEvent.click(canvas.getByRole('button', { name: 'Privacy' }));

    await waitFor(() =>
      expect(canvas.getByText('Make Profile Public')).toBeInTheDocument(),
    );
    expect(
      canvas.queryByPlaceholderText('Enter your email address'),
    ).not.toBeInTheDocument();

    fireEvent.click(canvas.getByRole('button', { name: 'Notifications' }));

    await waitFor(() =>
      expect(canvas.getByText('Push Notifications')).toBeInTheDocument(),
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
        'Help improve Polycord by sharing usage events linked to your account. Turning this off stops future product analytics while signed in.',
      ),
    ).toBeInTheDocument();
  },
};

const blockedUsers = (
  <BlockedUsers
    load={async () => [{ id: 'one', displayName: 'Haruka Tanaka' }]}
    unblock={fn(async () => {})}
  />
);

export const BlockedAccountsDrillIn: Story = {
  args: { blockedUsers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(canvas.getByRole('button', { name: 'Privacy' }));
    await expect(canvas.queryByText('Haruka Tanaka')).not.toBeInTheDocument();
    fireEvent.click(
      await canvas.findByRole('button', { name: /^Blocked accounts/ }),
    );
    const view = (
      await canvas.findByRole('heading', { name: 'Blocked accounts' })
    ).closest('section') as HTMLElement;
    await expect(await canvas.findByText('Haruka Tanaka')).toBeInTheDocument();
    await expect(
      canvas.getByRole('searchbox', {
        name: 'Search blocked accounts by name or username',
      }),
    ).toBeInTheDocument();
    fireEvent.click(within(view).getByRole('button', { name: 'Privacy' }));
    await expect(
      await canvas.findByText('Product analytics'),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('Haruka Tanaka')).not.toBeInTheDocument();
  },
};

export const MobileBlockedAccounts: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { blockedUsers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Privacy/ }));
    fireEvent.click(
      await canvas.findByRole('button', { name: /^Blocked accounts/ }),
    );
    await expect(
      await canvas.findByRole('heading', {
        name: 'Blocked accounts',
        level: 1,
      }),
    ).toBeInTheDocument();
    await expect(await canvas.findByText('Haruka Tanaka')).toBeInTheDocument();
    fireEvent.click(canvas.getByRole('button', { name: 'Privacy' }));
    await expect(
      await canvas.findByRole('heading', { name: 'Privacy', level: 1 }),
    ).toBeInTheDocument();
  },
};

export const EmailValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const email = canvas.getByPlaceholderText(
      'Enter your email address',
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
      canvas.getByPlaceholderText('Enter your email address'),
    ).toBeInTheDocument();
  },
};

export const SaveFlow: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.queryByRole('button', { name: 'Save Settings' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText('All changes saved')).toBeNull();

    const email = canvas.getByPlaceholderText(
      'Enter your email address',
    ) as HTMLInputElement;
    setFieldValue(email, 'kenji.ito@polycord.app');

    await waitFor(
      () =>
        expect(
          canvas.getByText('You have unsaved changes'),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
    const saveButton = canvas.getByRole('button', { name: 'Save Settings' });
    await expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    await waitFor(
      () =>
        expect(
          canvas.queryByRole('button', { name: 'Save Settings' }),
        ).not.toBeInTheDocument(),
      { timeout: 5000 },
    );
  },
};

export const DiscardAndRevert: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByPlaceholderText(
      'Enter your email address',
    ) as HTMLInputElement;
    const expectBarHidden = () =>
      waitFor(
        () =>
          expect(
            canvas.queryByRole('button', { name: 'Discard' }),
          ).not.toBeInTheDocument(),
        { timeout: 5000 },
      );
    const expectBarShown = () =>
      waitFor(
        () =>
          expect(
            canvas.getByRole('button', { name: 'Discard' }),
          ).toBeInTheDocument(),
        { timeout: 5000 },
      );

    setFieldValue(email, 'discard.me@polycord.app');
    await expectBarShown();
    fireEvent.click(canvas.getByRole('button', { name: 'Discard' }));
    await expectBarHidden();
    await expect(email).toHaveValue('xhev@polycord.app');

    setFieldValue(email, 'revert.me@polycord.app');
    await expectBarShown();
    setFieldValue(email, 'xhev@polycord.app');
    await expectBarHidden();
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
      'Enter your email address',
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
    await expect(
      canvas.getByRole('button', { name: 'Save Settings' }),
    ).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Discard' })).toBeEnabled();
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

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Privacy/ }));
    await expect(
      await canvas.findByRole('heading', { name: 'Privacy', level: 1 }),
    ).toBeInTheDocument();
    fireEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    fireEvent.click(
      await canvas.findByRole('button', { name: /^Time Format/ }),
    );
    fireEvent.click(
      await within(await screen.findByRole('dialog')).findByRole('button', {
        name: '12-hour',
      }),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: /^Time Format/ }),
      ).toHaveTextContent('12-hour'),
    );
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ timeFormat: '12hr' }),
      ),
    );
    await expect(await canvas.findByText('Saved')).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Save' }),
    ).not.toBeInTheDocument();
  },
};

export const MobileSaveFailure: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    onSubmit: fn(async () => {
      throw new Error('Settings save failed');
    }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Privacy/ }));
    const toggle = await canvas.findByRole('switch', {
      name: 'Make Profile Public',
    });
    await expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalled());
    await expect(await canvas.findByText("Couldn't save")).toBeInTheDocument();
    await expect(
      canvas.getByRole('switch', { name: 'Make Profile Public' }),
    ).toBeChecked();
  },
};

export const MobileSavePending: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    onSubmit: fn(() => new Promise<void>(() => {})),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Privacy/ }));
    fireEvent.click(
      await canvas.findByRole('switch', { name: 'Make Profile Public' }),
    );
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));
    const other = canvas.getByRole('switch', {
      name: 'Allow anonymous copying',
    });
    await waitFor(() => expect(other).toBeDisabled());
    await userEvent.click(other);
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

export const MobileSessionExpired: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: {
    onSubmit: fn(async () => {
      throw new SessionExpiredError();
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    fireEvent.click(await canvas.findByRole('button', { name: /^Privacy/ }));
    fireEvent.click(
      await canvas.findByRole('switch', { name: 'Make Profile Public' }),
    );
    await expect(
      await canvas.findByRole('link', {
        name: 'Your session expired. Sign in again to save changes.',
      }),
    ).toBeInTheDocument();
  },
};
