import type { Meta, StoryObj } from '@storybook/react';
import { FaDiscord } from 'react-icons/fa';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'discord',
    weight: 'bold',
    children: 'Discord Button',
    icon: () => <FaDiscord />,
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'white',
    icon: () => <FaDiscord />,
  },
};
