import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'Components/Form/Label',
  component: Label,
  args: {
    children: 'Primary Language',
  },
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The design communicates requirements through validation messages,
    // so the required prop must not render an asterisk.
    await expect(canvas.queryByText('*')).not.toBeInTheDocument();
    await expect(canvas.getByText('Primary Language')).toBeVisible();
  },
};
