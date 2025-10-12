import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';
import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Form/Toggle',
  component: Toggle,
  decorators: [
    (Story) => (
      <div className="flex items-center space-x-2 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
  render: () => (
    <>
      <Toggle id="airplane-mode" />
      <Label htmlFor="airplane-mode">Toggle</Label>
    </>
  ),
};
