import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import type { DiscoveryTagCount } from './discoveryTags';
import { TagCloud } from './TagCloud';
import 'src/app/globals.css';

const sampleTags: DiscoveryTagCount[] = [
  { tag: 'Gaming', count: 4 },
  { tag: 'Anime', count: 3 },
  { tag: 'Coding', count: 2 },
  { tag: 'Music', count: 2 },
  { tag: 'Travel', count: 2 },
  { tag: 'Art', count: 1 },
];

const meta: Meta<typeof TagCloud> = {
  title: 'Discovery/TagCloud',
  component: TagCloud,
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-background-main p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TagCloud>;

const ControlledTagCloud = () => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (tag: string) =>
    setSelected((previous) =>
      previous.includes(tag)
        ? previous.filter((value) => value !== tag)
        : [...previous, tag],
    );

  return (
    <TagCloud
      tags={sampleTags}
      selected={selected}
      onToggle={toggle}
      onClear={() => setSelected([])}
    />
  );
};

export const Default: Story = {
  render: () => <ControlledTagCloud />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.queryByText(/selected/)).not.toBeInTheDocument();

    const gaming = canvas.getByRole('button', { name: 'Gaming (4)' });
    await expect(gaming).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(gaming);
    await expect(gaming).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(canvas.getByRole('button', { name: 'Anime (3)' }));
    const clear = canvas.getByRole('button', { name: /2 selected/ });
    await expect(clear).toBeInTheDocument();

    await userEvent.click(clear);

    await expect(gaming).toHaveAttribute('aria-pressed', 'false');
    expect(canvas.queryByText(/selected/)).not.toBeInTheDocument();
  },
};
