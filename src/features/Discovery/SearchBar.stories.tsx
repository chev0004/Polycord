import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import { SearchBar } from './SearchBar';
import 'src/app/globals.css';

const meta: Meta<typeof SearchBar> = {
  title: 'Discovery/SearchBar',
  component: SearchBar,
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-background-main p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

const ControlledSearchBar = () => {
  const [value, setValue] = useState('');

  return <SearchBar value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: () => <ControlledSearchBar />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Search profiles' });

    await expect(input).toHaveValue('');

    await userEvent.type(input, 'Tokyo');
    await expect(input).toHaveValue('Tokyo');
  },
};
