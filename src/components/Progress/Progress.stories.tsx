import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Components/Progress',
  component: Progress,
  decorators: [
    (Story) => (
      <div className="w-96 p-10">
        <Story />
      </div>
    ),
  ],
  args: { 'aria-label': 'Seeding profiles' },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Determinate: Story = {
  args: { value: 42, max: 100 },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '42');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
  },
};

export const Complete: Story = {
  args: { value: 5000, max: 5000 },
};

export const Indeterminate: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar');
    await expect(bar).not.toHaveAttribute('aria-valuenow');
  },
};
