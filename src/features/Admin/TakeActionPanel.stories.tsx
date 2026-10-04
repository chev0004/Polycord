import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { moderationSnapshot } from './moderationFixtures';
import { TakeActionPanel } from './TakeActionPanel';

const actionFetch = fn();

const mockPanelApi =
  (userId: string, failures = 0) =>
  () => {
    const original = globalThis.fetch;
    let remaining = failures;
    actionFetch.mockReset();
    globalThis.fetch = Object.assign(
      async (...args: Parameters<typeof fetch>) => {
        const url = String(args[0]);
        if (url.startsWith('/api/admin/case')) {
          if (remaining > 0) {
            remaining -= 1;
            return new Response('{}', { status: 500 });
          }
          return new Response(
            JSON.stringify({
              userId,
              users: moderationSnapshot.users,
              reports: moderationSnapshot.reports.filter(
                (report) => report.userId === userId,
              ),
              log: moderationSnapshot.log.filter(
                (entry) => entry.userId === userId,
              ),
            }),
          );
        }
        if (url !== '/api/admin/moderation') return original(...args);
        const body = JSON.parse(String(args[1]?.body));
        actionFetch(body);
        const target = moderationSnapshot.users.find(
          (user) => user.id === userId,
        );
        return new Response(
          JSON.stringify({
            users: [{ ...target, hidden: body.action === 'hide_profile' }],
            reports: [],
            log: [
              {
                id: `action-${actionFetch.mock.calls.length}`,
                action: body.action,
                userId,
                staffId: 'kenji',
                note: body.note,
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        );
      },
      { preconnect: original.preconnect },
    );
    return () => {
      globalThis.fetch = original;
    };
  };

const meta: Meta<typeof TakeActionPanel> = {
  title: 'Features/Admin/TakeActionPanel',
  component: TakeActionPanel,
  parameters: { layout: 'fullscreen' },
  args: {
    profileId: 'profile-ryan',
    displayName: 'Ryan Mercer',
    meId: 'kenji',
    meRole: 'owner',
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TakeActionPanel>;

export const Owner: Story = {
  beforeEach: mockPanelApi('ryan'),
  play: async () => {
    const panel = within(
      await screen.findByRole('dialog', { name: 'Moderate Ryan Mercer' }),
    );
    await expect(
      await panel.findByRole('heading', { name: 'Ryan Mercer' }),
    ).toBeInTheDocument();
    await expect(panel.getByText('2 pending reports')).toBeInTheDocument();
    await expect(
      panel.getByRole('button', { name: 'Ban' }),
    ).toBeInTheDocument();
    await userEvent.click(panel.getByRole('button', { name: 'Hide profile' }));
    await waitFor(() =>
      expect(actionFetch).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'ryan', action: 'hide_profile' }),
      ),
    );
    await expect(
      await panel.findByRole('button', { name: 'Unhide profile' }),
    ).toBeInTheDocument();
    await expect(
      panel.getByRole('heading', { name: 'Ryan Mercer' }),
    ).toBeInTheDocument();
  },
};

export const Moderator: Story = {
  args: { meId: 'tomas', meRole: 'moderator' },
  beforeEach: mockPanelApi('ryan'),
  play: async () => {
    const panel = within(await screen.findByRole('dialog'));
    await panel.findByRole('heading', { name: 'Ryan Mercer' });
    await expect(
      panel.queryByRole('button', { name: 'Ban' }),
    ).not.toBeInTheDocument();
    await expect(panel.queryByText('Supporter')).not.toBeInTheDocument();
  },
};

export const StaffAccount: Story = {
  args: { displayName: 'Tomás Ruiz' },
  beforeEach: mockPanelApi('tomas'),
  play: async () => {
    const panel = within(await screen.findByRole('dialog'));
    await expect(
      await panel.findByText(/Staff can't be actioned/),
    ).toBeInTheDocument();
    await expect(
      panel.queryByRole('button', { name: 'Warn' }),
    ).not.toBeInTheDocument();
  },
};

export const OwnAccount: Story = {
  args: { meId: 'ryan', displayName: 'Ryan Mercer' },
  beforeEach: mockPanelApi('ryan'),
  play: async () => {
    const panel = within(await screen.findByRole('dialog'));
    await expect(
      await panel.findByText(/This is your account/),
    ).toBeInTheDocument();
  },
};

export const LoadFailed: Story = {
  beforeEach: mockPanelApi('ryan', 1),
  play: async () => {
    const panel = within(await screen.findByRole('dialog'));
    await userEvent.click(await panel.findByRole('button', { name: 'Retry' }));
    await expect(
      await panel.findByRole('heading', { name: 'Ryan Mercer' }),
    ).toBeInTheDocument();
  },
};

export const BottomSheet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
  beforeEach: mockPanelApi('ryan'),
  play: async () => {
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('heading', { name: 'Ryan Mercer' });
    const sheet = window.innerWidth <= 860;
    await waitFor(() => {
      const box = dialog.getBoundingClientRect();
      expect(box.bottom).toBeCloseTo(window.innerHeight, 0);
      expect(box.width).toBe(sheet ? window.innerWidth : 460);
      expect(box.top === 0).toBe(!sheet);
    });
  },
};
