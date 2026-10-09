import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  screen,
  waitFor,
  within,
} from '@storybook/test';
import { ModerationPage } from './ModerationPage';
import {
  emptyModerationSnapshot,
  moderationSnapshot,
  moderatorSnapshot,
} from './moderationFixtures';
import type { ModLogEntry, ModUser, SeedStatus } from './types';

const seed: SeedStatus = {
  real: 17,
  dummies: 0,
  cap: 50000,
  label: 'Staging/Test Database',
  shared: true,
};

const seedFetch = fn();

const mockSeedApi = (start: number) => () => {
  const original = globalThis.fetch;
  let dummies = start;
  seedFetch.mockReset();
  globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof fetch>) => {
      if (String(args[0]) !== '/api/admin/seed') return original(...args);
      seedFetch(JSON.parse(String(args[1]?.body)));
      const { target } = JSON.parse(String(args[1]?.body));
      dummies =
        target > dummies
          ? Math.min(target, dummies + 2000)
          : Math.max(target, dummies - 2000);
      return new Response(JSON.stringify({ ...seed, dummies }));
    },
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
  };
};

const recorded: ModLogEntry[] = [];

const activityPage = () =>
  new Response(
    JSON.stringify({
      users: [],
      reports: [],
      log: [...recorded, ...moderationSnapshot.log],
    }),
  );

const mockActivityApi = () => {
  const original = globalThis.fetch;
  recorded.length = 0;
  globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof fetch>) =>
      String(args[0]).startsWith('/api/admin/activity-log')
        ? activityPage()
        : original(...args),
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
  };
};

const premiumFetch = fn();

const mockSupporterApi = () => {
  const original = globalThis.fetch;
  const ryan = moderationSnapshot.users.find(
    (user) => user.id === 'ryan',
  ) as ModUser;
  recorded.length = 0;
  premiumFetch.mockReset();
  globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof fetch>) => {
      if (String(args[0]).startsWith('/api/admin/activity-log'))
        return activityPage();
      if (String(args[0]) !== '/api/admin/premium') return original(...args);
      const method = args[1]?.method;
      const request = JSON.parse(String(args[1]?.body));
      premiumFetch(method, request);
      const expiresAt = '2027-03-28T10:15:00.000Z';
      const entry: ModLogEntry = {
        id: `premium-${premiumFetch.mock.calls.length}`,
        action: method === 'POST' ? 'premium_grant' : 'premium_revoke',
        userId: 'ryan',
        staffId: 'kenji',
        grant:
          method === 'POST'
            ? { amount: request.amount, unit: request.unit }
            : undefined,
        expiresAt,
        createdAt: new Date().toISOString(),
      };
      recorded.unshift(entry);
      return new Response(
        JSON.stringify({
          users: [
            {
              ...ryan,
              premium: {
                configured: false,
                grantedUntil: method === 'POST' ? expiresAt : undefined,
              },
            },
          ],
          reports: [],
          log: [entry],
        }),
      );
    },
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
  };
};

const moderationFetch = fn();

const mockModerationApi = () => {
  const original = globalThis.fetch;
  const ryan = moderationSnapshot.users.find(
    (user) => user.id === 'ryan',
  ) as ModUser;
  recorded.length = 0;
  moderationFetch.mockReset();
  globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof fetch>) => {
      if (String(args[0]).startsWith('/api/admin/activity-log'))
        return activityPage();
      if (String(args[0]) !== '/api/admin/moderation') return original(...args);
      const body = JSON.parse(String(args[1]?.body));
      moderationFetch(body);
      const entry: ModLogEntry = {
        id: `action-${moderationFetch.mock.calls.length}`,
        action: body.action,
        userId: 'ryan',
        staffId: 'kenji',
        note: body.note,
        category: body.category,
        createdAt: new Date().toISOString(),
      };
      recorded.unshift(entry);
      return new Response(
        JSON.stringify({
          users: [{ ...ryan, warnings: ryan.warnings + 1 }],
          reports: [],
          log: [entry],
        }),
      );
    },
    { preconnect: original.preconnect },
  );
  return () => {
    globalThis.fetch = original;
  };
};

const meta: Meta<typeof ModerationPage> = {
  title: 'Features/Admin/ModerationPage',
  component: ModerationPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background-main">
        <Story />
      </div>
    ),
  ],
  args: { initial: moderationSnapshot },
};

export default meta;
type Story = StoryObj<typeof ModerationPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const queue = canvas.getByRole('region', { name: 'Reports' });
    await expect(
      within(queue).getByRole('button', { name: /Ryan Mercer/ }),
    ).toHaveTextContent('2 reports');
    await expect(
      canvas.getByRole('button', { name: /^Dismiss 2/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('tab', { name: 'Dummy data' }),
    ).not.toBeInTheDocument();
  },
};

export const DummyData: Story = {
  args: { seed },
  beforeEach: mockSeedApi(0),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('tab', { name: 'Dummy data' }));
    const panel = within(
      await canvas.findByRole('region', { name: 'Dummy data' }),
    );
    await expect(
      panel.getByText('Affected database: Staging/Test Database'),
    ).toBeInTheDocument();
    await expect(panel.getByText(/share this database/)).toBeInTheDocument();
    fireEvent.click(panel.getByRole('button', { name: '5,000' }));
    const apply = panel.getByRole('button', { name: 'Apply' });
    await waitFor(() => expect(apply).toBeEnabled());
    fireEvent.click(apply);
    await waitFor(() =>
      expect(
        panel.getByText('Dummy profiles').nextElementSibling,
      ).toHaveTextContent('5,000'),
    );
    await expect(
      panel.getByText('Real accounts').nextElementSibling,
    ).toHaveTextContent('17');
    await expect(seedFetch).toHaveBeenCalledTimes(3);
    await expect(seedFetch).toHaveBeenCalledWith({ target: 5000 });
  },
};

export const DummyDataOverCap: Story = {
  args: { seed },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('tab', { name: 'Dummy data' }));
    const panel = within(
      await canvas.findByRole('region', { name: 'Dummy data' }),
    );
    fireEvent.change(panel.getByRole('spinbutton'), {
      target: { value: '50001' },
    });
    await expect(panel.getByRole('button', { name: 'Apply' })).toBeDisabled();
  },
};

export const DummyDataMobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { seed: { ...seed, dummies: 3000 } },
  beforeEach: mockSeedApi(3000),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(await canvas.findByRole('button', { name: 'Dummy data' }));
    const panel = within(
      await canvas.findByRole('region', { name: 'Dummy data' }),
    );
    fireEvent.click(panel.getByRole('button', { name: 'Remove all' }));
    await waitFor(() =>
      expect(
        panel.getByText('Dummy profiles').nextElementSibling,
      ).toHaveTextContent(/^0$/),
    );
    await expect(seedFetch).toHaveBeenCalledTimes(2);
    await expect(
      panel.getByRole('button', { name: 'Remove all' }),
    ).toBeDisabled();
  },
};

export const OwnerModeratesModerator: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /Tomás Ruiz/ }));
    await canvas.findByRole('button', { name: /^Warn/ });
    await expect(
      canvas.queryByText(/Only owners can take action on moderators/),
    ).not.toBeInTheDocument();
  },
};

export const SuspendDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: 'Suspend' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Custom' }));
    const days = await dialog.findByRole('spinbutton');
    fireEvent.change(days, { target: { value: '120' } });
    await expect(
      dialog.getByText('Please enter a whole number of days from 1 to 90.'),
    ).toBeInTheDocument();
    await expect(
      dialog.getByRole('button', { name: 'Suspend for …' }),
    ).toBeDisabled();
  },
};

export const QueueClear: Story = {
  args: { initial: emptyModerationSnapshot },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Queue clear')).toBeInTheDocument();
  },
};

export const ActivityLog: Story = {
  beforeEach: mockActivityApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('tab', { name: 'Activity log' }));
    await expect(
      await canvas.findByText('Suspended user · 7 days'),
    ).toBeInTheDocument();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText('2 cases need review'),
    ).toBeInTheDocument();
    fireEvent.click(canvas.getByRole('button', { name: /Ryan Mercer/ }));
    await expect(
      await canvas.findByRole('button', { name: /Take action/ }),
    ).toBeInTheDocument();
  },
};

export const MobileQueueClear: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  args: { initial: emptyModerationSnapshot },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Queue clear')).toBeInTheDocument();
  },
};

export const ManageStaff: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: 'Manage staff' }));
    await expect(await screen.findByText('Tomás Ruiz')).toBeInTheDocument();
    await expect(
      screen.getByRole('button', { name: 'Remove Tomás Ruiz as moderator' }),
    ).toBeInTheDocument();
    await expect(
      screen.getByRole('button', { name: 'Add moderator' }),
    ).toBeInTheDocument();
  },
};

export const ModeratorView: Story = {
  args: { initial: moderatorSnapshot },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Moderator')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /^Warn/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: /^Ban/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Manage staff' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText('Supporter')).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Grant Supporter' }),
    ).not.toBeInTheDocument();
  },
};

export const SupporterGrant: Story = {
  beforeEach: mockSupporterApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText('No complimentary Supporter.'),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByText('Supporter', { selector: 'span' }),
    ).toBeNull();
    const amount = canvas.getByRole('spinbutton', { name: 'Grant length' });
    fireEvent.change(amount, { target: { value: '0' } });
    await expect(
      canvas.getByText('Enter a whole number from 1 to 24.'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Grant Supporter' }),
    ).toBeDisabled();
    fireEvent.change(amount, { target: { value: '25' } });
    await expect(
      canvas.getByText('Enter a whole number from 1 to 24.'),
    ).toBeInTheDocument();
    fireEvent.change(amount, { target: { value: '2' } });
    fireEvent.click(canvas.getByRole('button', { name: 'Years' }));
    await expect(canvas.getByText(/^Ends/)).toBeInTheDocument();
    fireEvent.click(canvas.getByRole('button', { name: 'Grant Supporter' }));
    await expect(
      await canvas.findByText(/^Complimentary Supporter until/),
    ).toBeInTheDocument();
    await expect(premiumFetch).toHaveBeenCalledWith('POST', {
      userId: 'ryan',
      amount: 2,
      unit: 'years',
    });
    await expect(canvas.getByText('Extend by')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Extend Supporter' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getAllByText('Supporter', { selector: 'span' }),
    ).not.toHaveLength(0);
    fireEvent.click(canvas.getByRole('tab', { name: 'Activity log' }));
    await waitFor(() =>
      expect(
        canvas.getByText('Granted Supporter, 2 years'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(canvas.getByRole('tab', { name: /^Reports/ }));
    fireEvent.click(await canvas.findByRole('button', { name: 'Revoke' }));
    await expect(
      await canvas.findByText('No complimentary Supporter.'),
    ).toBeInTheDocument();
    await expect(premiumFetch).toHaveBeenCalledWith('DELETE', {
      userId: 'ryan',
    });
  },
};

export const SupporterOtherSources: Story = {
  args: {
    initial: {
      ...moderationSnapshot,
      users: moderationSnapshot.users.map((user) =>
        user.id === 'ryan'
          ? {
              ...user,
              premium: {
                configured: true,
                grantedUntil: new Date(
                  Date.now() + 86400000 * 30,
                ).toISOString(),
                subscriptionUntil: new Date(
                  Date.now() + 86400000 * 12,
                ).toISOString(),
              },
            }
          : user,
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/^Paid subscription active until/),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText('Supporter through the configured Supporter list.'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/won't end Supporter while another source is active/),
    ).toBeInTheDocument();
  },
};

export const SupporterMobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  beforeEach: mockSupporterApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(await canvas.findByRole('button', { name: /Ryan Mercer/ }));
    await expect(await canvas.findByText('Supporter')).toBeInTheDocument();
    await expect(canvas.getByText('None')).toBeInTheDocument();
    fireEvent.click(await canvas.findByRole('button', { name: /Take action/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: /^Grant Supporter/ }),
    );
    const sheet = within(
      await screen.findByRole('dialog', { name: 'Grant Supporter' }),
    );
    const weeks = sheet.getByRole('button', { name: 'Weeks' });
    fireEvent.click(weeks);
    await waitFor(() => expect(weeks).toHaveAttribute('aria-pressed', 'true'));
    await expect(sheet.getByText(/^Ends/)).toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'Grant Supporter' }));
    await waitFor(() =>
      expect(premiumFetch).toHaveBeenCalledWith('POST', {
        userId: 'ryan',
        amount: 1,
        unit: 'weeks',
      }),
    );
    await expect(await canvas.findByText(/^Until /)).toBeInTheDocument();
    fireEvent.click(await canvas.findByRole('button', { name: /Take action/ }));
    await expect(
      await screen.findByRole('button', { name: /^Extend Supporter/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Revoke Supporter/ }));
    await waitFor(() =>
      expect(premiumFetch).toHaveBeenCalledWith('DELETE', { userId: 'ryan' }),
    );
  },
};

export const PendingCasesBeyondLoaded: Story = {
  args: { initial: { ...moderationSnapshot, pendingCases: 5 } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('tab', { name: 'Reports 5' }),
    ).toBeInTheDocument();
  },
};

export const WarnComposer: Story = {
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /^Warn/ }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(moderationFetch).not.toHaveBeenCalled();
    await expect(
      dialog.getByRole('button', { name: 'Send warning' }),
    ).toBeDisabled();
    await expect(
      dialog.queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0);
    await expect(
      dialog.getAllByRole('button', { pressed: false }),
    ).toHaveLength(7);
    fireEvent.click(
      dialog.getByRole('button', { name: 'Spam or advertising' }),
    );
    const message = dialog.getByRole('textbox', { name: 'Message' });
    await waitFor(() =>
      expect((message as HTMLTextAreaElement).value).toMatch(
        /^After a review of a report, we found that you posted spam/,
      ),
    );
    fireEvent.change(message, { target: { value: '   ' } });
    await waitFor(() =>
      expect(
        dialog.getByRole('button', { name: 'Send warning' }),
      ).toBeDisabled(),
    );
    fireEvent.change(message, {
      target: { value: '  Please stop posting ads.  ' },
    });
    await expect(
      await dialog.findByText('Please stop posting ads.', { selector: 'p' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        dialog.getByRole('button', { name: 'Send warning' }),
      ).toBeEnabled(),
    );
    fireEvent.click(dialog.getByRole('button', { name: 'Send warning' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'warn',
          userId: 'ryan',
          note: 'Please stop posting ads.',
        }),
      ),
    );
    fireEvent.click(canvas.getByRole('tab', { name: 'Activity log' }));
    await expect(
      await canvas.findByText('Please stop posting ads.'),
    ).toBeInTheDocument();
  },
};

export const WarnPreset: Story = {
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /^Warn/ }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(
      dialog.getByRole('button', { name: 'Spam or advertising' }),
    );
    await waitFor(() =>
      expect(
        dialog.getByRole('button', { name: 'Send warning' }),
      ).toBeEnabled(),
    );
    fireEvent.click(dialog.getByRole('button', { name: 'Send warning' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'warn',
          userId: 'ryan',
          category: 'spam',
        }),
      ),
    );
    await expect(moderationFetch.mock.calls[0][0].note).toBeUndefined();
    fireEvent.click(canvas.getByRole('tab', { name: 'Activity log' }));
    await expect(
      await canvas.findByText(
        /^After a review of a report, we found that you posted spam/,
      ),
    ).toBeInTheDocument();
  },
};

export const WarnEditedPreset: Story = {
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /^Warn/ }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(
      dialog.getByRole('button', { name: 'Spam or advertising' }),
    );
    const message = dialog.getByRole('textbox', { name: 'Message' });
    await waitFor(() => expect(message).not.toHaveValue(''));
    fireEvent.change(message, { target: { value: 'Edited by a moderator.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send warning' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'warn',
          note: 'Edited by a moderator.',
        }),
      ),
    );
    await expect(moderationFetch.mock.calls[0][0].category).toBeUndefined();
  },
};

export const HideConfirmation: Story = {
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('textbox', { name: 'Note' })).toBeNull();
    fireEvent.keyDown(document.body, { key: 'h' });
    let dialog = within(
      await screen.findByRole('dialog', {
        name: "Hide Ryan Mercer's profile?",
      }),
    );
    fireEvent.change(dialog.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Cancelled note' },
    });
    await expect(moderationFetch).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(canvas.getByRole('button', { name: 'Hide profile' }));
    dialog = within(
      await screen.findByRole('dialog', {
        name: "Hide Ryan Mercer's profile?",
      }),
    );
    await expect(dialog.getByRole('textbox', { name: 'Note' })).toHaveValue('');
    fireEvent.change(dialog.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Visibility reviewed.' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Hide profile' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hide_profile',
          note: 'Visibility reviewed.',
        }),
      ),
    );
    fireEvent.click(canvas.getByRole('tab', { name: 'Activity log' }));
    await expect(
      await canvas.findByText('Visibility reviewed.'),
    ).toBeInTheDocument();
  },
};

export const DismissConfirmation: Story = {
  beforeEach: mockModerationApi,
  play: async () => {
    fireEvent.keyDown(document.body, { key: 'd' });
    let dialog = within(
      await screen.findByRole('dialog', { name: 'Dismiss 2 reports?' }),
    );
    await expect(moderationFetch).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.keyDown(document.body, { key: 'd' });
    dialog = within(
      await screen.findByRole('dialog', { name: 'Dismiss 2 reports?' }),
    );
    fireEvent.change(dialog.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'No violation found.' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss 2 reports' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dismiss',
          reportIds: ['r1', 'r2'],
          note: 'No violation found.',
        }),
      ),
    );
  },
};

export const DismissStaffReport: Story = {
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /Tomás Ruiz/ }));
    fireEvent.click(
      await canvas.findByRole('button', { name: /^Dismiss(?!\s\d)/ }),
    );
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Dismiss report?' }),
    );
    await expect(moderationFetch).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss report' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dismiss',
          userId: 'tomas',
          reportIds: ['r3'],
        }),
      ),
    );
    await expect(moderationFetch.mock.lastCall?.[0].note).toBeUndefined();
  },
};

export const DismissMobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(await canvas.findByRole('button', { name: /Ryan Mercer/ }));
    const dismiss = await canvas.findByRole('button', { name: 'Dismiss 2' });
    await expect(dismiss.querySelector('svg')).toBeNull();
    fireEvent.click(dismiss);
    let dialog = within(
      await screen.findByRole('dialog', { name: 'Dismiss 2 reports?' }),
    );
    await expect(moderationFetch).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(canvas.getByRole('button', { name: 'Dismiss 2' }));
    dialog = within(
      await screen.findByRole('dialog', { name: 'Dismiss 2 reports?' }),
    );
    fireEvent.change(dialog.getByRole('textbox', { name: 'Note' }), {
      target: { value: 'Reviewed both reports.' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss 2 reports' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dismiss',
          note: 'Reviewed both reports.',
        }),
      ),
    );
  },
};

export const DismissSwipe: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('button', { name: /Ryan Mercer/ });
    fireEvent.click(canvas.getByLabelText('Dismiss reports on Ryan Mercer'));
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Dismiss 2 reports?' }),
    );
    await expect(moderationFetch).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss 2 reports' }));
    await waitFor(() => expect(moderationFetch).toHaveBeenCalledTimes(1));
    await expect(moderationFetch.mock.lastCall?.[0].note).toBeUndefined();
  },
};

export const WarnCancelled: Story = {
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.keyDown(document.body, { key: 'w' });
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Custom message' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Draft that is never sent' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(moderationFetch).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole('button', { name: /^Warn/ }),
    ).toBeInTheDocument();
  },
};

export const WarnMobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  beforeEach: mockModerationApi,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(await canvas.findByRole('button', { name: /Ryan Mercer/ }));
    fireEvent.click(await canvas.findByRole('button', { name: /Take action/ }));
    const sheet = within(await screen.findByRole('dialog'));
    fireEvent.click(sheet.getByRole('button', { name: /^Warn/ }));
    await expect(moderationFetch).not.toHaveBeenCalled();
    const warning = within(
      await screen.findByRole('dialog', { name: /^Warn Ryan/ }),
    );
    await expect(
      warning.getByRole('button', { name: 'Send warning' }),
    ).toBeDisabled();
    await expect(
      warning
        .getByRole('button', { name: 'Send warning' })
        .querySelector('svg'),
    ).toBeNull();
    fireEvent.click(warning.getByRole('button', { name: 'Harassment' }));
    fireEvent.change(warning.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'Stop contacting members who said no.' },
    });
    fireEvent.click(warning.getByRole('button', { name: 'Send warning' }));
    await waitFor(() =>
      expect(moderationFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'warn',
          note: 'Stop contacting members who said no.',
        }),
      ),
    );
  },
};

export const ActionStrip: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const strip = within(
      canvas.getByRole('toolbar', { name: 'Moderation actions' }),
    );
    await expect(
      strip.getAllByRole('button').map((button) => button.ariaLabel),
    ).toEqual(['Warn', 'Hide profile', 'Suspend', 'Ban']);
    await expect(canvas.getByText('2 pending reports')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /^Dismiss 2/ }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /^Dismiss 2/ }).querySelector('svg'),
    ).toBeNull();
    fireEvent.click(canvas.getByRole('tab', { name: /^Resolved/ }));
    await waitFor(() =>
      expect(canvas.queryByText(/pending reports?$/)).not.toBeInTheDocument(),
    );
    await expect(
      canvas.queryByRole('button', { name: /^Dismiss/ }),
    ).not.toBeInTheDocument();
  },
};
