import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { findCardTheme } from '@/features/Discovery/cardTheme';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { BlockedUsers } from './BlockedUsers';

const kenjiProfile: DiscoveryProfile = {
  id: 'profile-kenji',
  displayName: 'Kenji Ito',
  discordUsername: 'kenji.ito',
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'intermediate' }],
  about: 'Weekend hiker practising English before a move to Toronto.',
  tags: ['Hiking', 'Coffee'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
  cardTheme: findCardTheme('pink'),
};
const accounts = [
  {
    id: 'one',
    displayName: 'Kenji Ito',
    username: 'kenji.ito',
    profile: kenjiProfile,
  },
  {
    id: 'two',
    displayName: 'Haruka Tanaka',
    username: 'haruka_t',
    profile: null,
  },
];
const meta: Meta<typeof BlockedUsers> = {
  title: 'Features/Settings/BlockedUsers',
  component: BlockedUsers,
  parameters: { nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <div className="max-w-xl rounded-3xl bg-background-dark p-6">
          <Story />
        </div>
      </RouteProgressProvider>
    ),
  ],
  args: {
    load: async () => accounts,
    unblock: fn(async () => {}),
    onChange: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

const search = async (canvas: ReturnType<typeof within>, value: string) => {
  const field = await canvas.findByRole('searchbox', {
    name: 'Search blocked accounts by name or username',
  });
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => expect(field).toHaveValue(value));
};

export const Default: Story = {};
export const Empty: Story = { args: { load: async () => [] } };
export const Unblock: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Unblock Kenji Ito' }),
    );
    await waitFor(() =>
      expect(canvas.queryByText('Kenji Ito')).not.toBeInTheDocument(),
    );
    expect(canvas.getByText('Haruka Tanaka')).toBeInTheDocument();
    expect(args.unblock).toHaveBeenCalledWith('one');
    expect(args.onChange).toHaveBeenCalled();
  },
};
export const LoadFailure: Story = {
  args: {
    load: async () => {
      throw new Error('Unavailable');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      "Couldn't load blocked accounts.",
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
  },
};
export const UnblockFailure: Story = {
  args: {
    unblock: async () => {
      throw new Error('Unavailable');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Unblock Kenji Ito' }),
    );
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      "Couldn't unblock this account.",
    );
    expect(canvas.getByText('Kenji Ito')).toBeInTheDocument();
    expect(
      canvas.getByRole('button', { name: 'Unblock Kenji Ito' }),
    ).toBeEnabled();
  },
};
export const SearchByName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await search(canvas, 'TANAKA');
    await waitFor(() =>
      expect(canvas.queryByText('Kenji Ito')).not.toBeInTheDocument(),
    );
    expect(canvas.getByText('Haruka Tanaka')).toBeInTheDocument();
    await search(canvas, 'two');
    await expect(
      await canvas.findByText('No blocked accounts match that search.'),
    ).toBeInTheDocument();
    await search(canvas, '');
    await expect(await canvas.findByText('Kenji Ito')).toBeInTheDocument();
    expect(canvas.getByText('Haruka Tanaka')).toBeInTheDocument();
  },
};
export const UnblockFiltered: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await search(canvas, 'kenji');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Unblock Kenji Ito' }),
    );
    await expect(
      await canvas.findByText('No blocked accounts match that search.'),
    ).toBeInTheDocument();
    expect(args.unblock).toHaveBeenCalledWith('one');
    await search(canvas, '');
    await expect(await canvas.findByText('Haruka Tanaka')).toBeInTheDocument();
    expect(canvas.queryByText('Kenji Ito')).not.toBeInTheDocument();
  },
};
export const Usernames: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('@kenji.ito')).toBeInTheDocument();
    expect(canvas.getByText('@haruka_t')).toBeInTheDocument();
    await search(canvas, 'HARUKA_');
    await waitFor(() =>
      expect(canvas.queryByText('Kenji Ito')).not.toBeInTheDocument(),
    );
    expect(canvas.getByText('Haruka Tanaka')).toBeInTheDocument();
  },
};
const openPreview = async (canvasElement: HTMLElement) => {
  await userEvent.click(
    await within(canvasElement).findByRole('button', {
      name: "Show Kenji Ito's profile",
    }),
  );
  const dialog = within(await screen.findByRole('dialog'));
  await expect(
    await dialog.findByText(
      'Weekend hiker practising English before a move to Toronto.',
    ),
  ).toBeInTheDocument();
  expect(dialog.getByText('Hiking')).toBeInTheDocument();
  expect(dialog.queryByText(/ago|just now/i)).toBeNull();
  return dialog;
};

const closePreview = async (canvasElement: HTMLElement) => {
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(within(canvasElement).getByText('Kenji Ito')).toBeInTheDocument();
};

export const PreviewProfile: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = await openPreview(canvasElement);
    expect(
      dialog.getByRole('button', { name: 'Copy profile link' }),
    ).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await expect(
      await screen.findByRole('button', { name: 'Report profile' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /block|save|bookmark/i }),
    ).toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Report profile' }),
      ).toBeNull(),
    );
    await closePreview(canvasElement);
    expect(args.unblock).not.toHaveBeenCalled();
  },
};
export const ReportFromPreview: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = await openPreview(canvasElement);
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Report profile' }),
    );
    await expect(
      await screen.findByRole('dialog', { name: 'Report profile' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Report profile' }),
      ).toBeNull(),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await closePreview(canvasElement);
    expect(args.unblock).not.toHaveBeenCalled();
  },
};
export const MobilePreviewProfile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement, args }) => {
    const dialog = await openPreview(canvasElement);
    expect(dialog.queryByRole('button', { name: 'More actions' })).toBeNull();
    expect(
      dialog.queryByRole('button', { name: 'Copy profile link' }),
    ).toBeNull();
    expect(
      dialog.queryByRole('button', { name: /block|save|bookmark/i }),
    ).toBeNull();
    await closePreview(canvasElement);
    expect(args.unblock).not.toHaveBeenCalled();
  },
};
export const NoPreviewWithoutProfile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Haruka Tanaka')).toBeInTheDocument();
    expect(
      canvas.queryByRole('button', { name: "Show Haruka Tanaka's profile" }),
    ).toBeNull();
  },
};
