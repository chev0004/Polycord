import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  decorators: [
    (Story) => (
      <div className="flex gap-3 bg-background-main p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Static: Story = {
  args: {
    children: 'Gaming',
  },
};

export const WithoutDot: Story = {
  args: {
    children: 'Japanese',
    withDot: false,
  },
};

const RemovableChip = ({ onRemove }: { onRemove: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Chip
      onRemove={() => {
        onRemove();
        setIsVisible(false);
      }}
    >
      Anime
    </Chip>
  );
};

const removeChip = fn();

export const Removable: Story = {
  render: () => <RemovableChip onRemove={removeChip} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: /remove anime/i }),
    );

    await expect(removeChip).toHaveBeenCalled();
    await expect(canvas.queryByText('Anime')).not.toBeInTheDocument();
  },
};
