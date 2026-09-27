import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fireEvent,
  fn,
  screen,
  waitFor,
  within,
} from '@storybook/test';
import { ModerationSkeleton } from './ModerationDesktop';
import { ModerationPage } from './ModerationPage';
import {
  emptyModerationSnapshot,
  moderationSnapshot,
  moderatorSnapshot,
} from './moderationFixtures';
import type { SeedStatus } from './types';

const seed: SeedStatus = {
  real: 17,
  dummies: 0,
  cap: 50000,
  label: 'Staging/Test Database',
  shared: true,
  environment: 'staging',
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

export const StaffProtected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /Tomás Ruiz/ }));
    await expect(
      await canvas.findByText(/Staff can't be actioned/),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: /^Warn/ }),
    ).not.toBeInTheDocument();
  },
};

export const SuspendDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.click(canvas.getByRole('button', { name: /^Suspend…/ }));
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

export const Loading: Story = {
  render: () => <ModerationSkeleton />,
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
  },
};
