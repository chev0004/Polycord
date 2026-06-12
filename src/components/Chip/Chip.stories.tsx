import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: {
    label: 'Gaming',
  },
};

export const WithoutDot: Story = {
  args: {
    label: 'Gaming',
    withDot: false,
  },
};

export const Clickable: Story = {
  args: {
    label: 'Gaming',
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button'));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

const RemovableChips = () => {
  const [tags, setTags] = useState(['Gaming', 'Anime', 'Music']);
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          onRemove={() => setTags(tags.filter((t) => t !== tag))}
          removeLabel={`Remove ${tag}`}
        />
      ))}
    </div>
  );
};

export const Removable: Story = {
  render: () => <RemovableChips />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByLabelText('Remove Anime'));

    await expect(canvas.queryByText('Anime')).not.toBeInTheDocument();
    await expect(canvas.getByText('Gaming')).toBeInTheDocument();
    await expect(canvas.getByText('Music')).toBeInTheDocument();
  },
};
