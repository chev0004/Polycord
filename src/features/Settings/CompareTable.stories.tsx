import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { CompareTable } from './CompareTable';

const meta: Meta<typeof CompareTable> = {
  title: 'Features/Settings/CompareTable',
  component: CompareTable,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[640px] rounded-3xl bg-background-dark p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CompareTable>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Feature')).toBeInTheDocument();
    await expect(canvas.getByText('Bump cooldown')).toBeInTheDocument();
    await expect(canvas.getByText('Profile view alerts')).toBeInTheDocument();
    await expect(canvas.getByText('Every 1 h 30 m')).toBeInTheDocument();
    await expect(canvas.getByText('See who viewed you')).toBeInTheDocument();
    await expect(canvas.getAllByText('No')).toHaveLength(2);
  },
};
