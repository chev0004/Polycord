import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { useState } from 'react';
import { DEFAULT_SORT, type DiscoverySortValue } from './discoverySort';
import { SortMenu } from './SortMenu';
import 'src/app/globals.css';

const meta: Meta<typeof SortMenu> = {
  title: 'Discovery/SortMenu',
  component: SortMenu,
  decorators: [
    (Story) => (
      <div className="flex max-w-3xl justify-end bg-background-main p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SortMenu>;

const ControlledSortMenu = () => {
  const [value, setValue] = useState<DiscoverySortValue>(DEFAULT_SORT);

  return <SortMenu value={value} onChange={setValue} />;
};

const openMenu = async (canvas: ReturnType<typeof within>, doc: Document) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));

  return within(
    await waitFor(() => {
      const content = doc.querySelector<HTMLElement>('.PopoverContent');
      if (!content) throw new Error('Sort popover did not open');
      return content;
    }),
  );
};

export const Default: Story = {
  render: () => <ControlledSortMenu />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;

    let popover = await openMenu(canvas, doc);

    for (const name of [
      'Last bumped',
      'Oldest bumped',
      'Name (A-Z)',
      'Name (Z-A)',
    ]) {
      await expect(popover.getByRole('button', { name })).toBeInTheDocument();
    }

    await expect(
      popover.getByRole('button', { name: 'Last bumped' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      popover.getByRole('button', { name: 'Name (A-Z)' }),
    ).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(popover.getByRole('button', { name: 'Name (A-Z)' }));

    popover = await openMenu(canvas, doc);

    await expect(
      popover.getByRole('button', { name: 'Name (A-Z)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      popover.getByRole('button', { name: 'Last bumped' }),
    ).toHaveAttribute('aria-pressed', 'false');
  },
};
