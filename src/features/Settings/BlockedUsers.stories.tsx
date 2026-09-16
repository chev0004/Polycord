import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { BlockedUsers } from './BlockedUsers';

const accounts = [
  { id: 'one', displayName: 'Kenji Ito' },
  { id: 'two', displayName: 'Haruka Tanaka' },
];
const meta: Meta<typeof BlockedUsers> = {
  title: 'Features/Settings/BlockedUsers',
  component: BlockedUsers,
  decorators: [
    (Story) => (
      <div className="max-w-xl rounded-3xl bg-background-dark p-6">
        <Story />
      </div>
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
