import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { SearchField } from './SearchField';

const Controlled = ({ initial = '' }: { initial?: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <SearchField
      className="h-11 border-line-strong pr-2 pl-4 focus-within:border-primary"
      inputClassName="text-[15px]"
      value={value}
      onClear={() => setValue('')}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Search blocked accounts"
      aria-label="Search"
    />
  );
};

const meta: Meta<typeof Controlled> = {
  title: 'Components/Form/SearchField',
  component: Controlled,
  decorators: [
    (Story) => (
      <div className="w-96 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument();
    await userEvent.type(canvas.getByRole('textbox'), 'kenji');
    await expect(
      canvas.getByRole('button', { name: 'Clear search' }),
    ).toBeInTheDocument();
  },
};

export const Filled: Story = {
  args: { initial: 'kenji.ito' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }));
    await expect(input).toHaveValue('');
    await expect(input).toHaveFocus();
    await expect(
      canvas.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument();
  },
};
