import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { Disclosure } from './Disclosure';

const meta: Meta<typeof Disclosure> = {
  title: 'Components/Disclosure',
  component: Disclosure,
  decorators: [
    (Story) => (
      <div className="w-96 p-10 text-foreground">
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Server spans',
    headerClassName:
      'min-h-12 rounded-xl bg-background-darker px-4 font-medium text-sm',
    children: <p className="px-4 py-3 text-muted text-sm">auth 12 ms</p>,
  },
};

export default meta;
type Story = StoryObj<typeof Disclosure>;

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByRole('button', {
      name: 'Server spans',
    });
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(
      within(canvasElement).getByText('auth 12 ms').closest('[inert]'),
    ).not.toBeNull();
  },
};

export const Open: Story = {
  args: { defaultOpen: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: 'Server spans' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('auth 12 ms')).toBeVisible();
  },
};

export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole('button', { name: 'Server spans' });
    await userEvent.tab();
    await expect(header).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(canvas.getByText('auth 12 ms')).toBeVisible());
    await userEvent.keyboard(' ');
    await expect(header).toHaveAttribute('aria-expanded', 'false');
  },
};
